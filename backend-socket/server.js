/**
 * CodeCollab Socket Server — Real-time collaboration backend.
 *
 * Architecture:
 *   Two WebSocket paths per room:
 *     /room/:roomId       — Control channel (JSON): join, approve, file sharing
 *     /doc/:roomId/:fileId — Yjs channel (binary): doc sync + cursor awareness
 *
 * Each shared file gets its own Y.Doc on the server, keyed by "roomId/fileId".
 * The control channel manages room lifecycle and file metadata.
 */

import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

// ─── Constants ─────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '4000', 10);
const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

// ─── In-memory state ──────────────────────────────────────────────────

/** @type {Map<string, Room>} */
const rooms = new Map();

/** @type {Map<string, { doc: Y.Doc, awareness: awarenessProtocol.Awareness, conns: Map<WebSocket, Set<number>> }>} */
const docs = new Map();

// ─── Room ──────────────────────────────────────────────────────────────

class Room {
  constructor(roomId) {
    this.roomId = roomId;
    this.hostId = null;

    /** @type {Map<string, { ws: WebSocket, displayName: string, color: string }>} */
    this.members = new Map();

    /** @type {Map<string, { ws: WebSocket, displayName: string, color: string }>} */
    this.pending = new Map();

    /** @type {Map<string, { id: string, name: string, language: string, content: string }>} */
    this.sharedFiles = new Map();
  }

  broadcastJson(msg, excludePeerId = null) {
    const data = JSON.stringify(msg);
    for (const [pid, member] of this.members) {
      if (pid !== excludePeerId && member.ws.readyState === WebSocket.OPEN) {
        member.ws.send(data);
      }
    }
  }

  getMembersList() {
    return Array.from(this.members.entries()).map(([peerId, m]) => ({
      peerId,
      displayName: m.displayName,
      color: m.color,
      isHost: peerId === this.hostId,
    }));
  }

  getPendingList() {
    return Array.from(this.pending.entries()).map(([peerId, p]) => ({
      peerId,
      displayName: p.displayName,
      color: p.color,
    }));
  }

  broadcastMembersUpdate() {
    this.broadcastJson({
      type: 'members-update',
      members: this.getMembersList(),
      pending: this.getPendingList(),
    });
  }

  getSharedFilesList() {
    return Array.from(this.sharedFiles.values()).map(f => ({
      id: f.id,
      name: f.name,
      language: f.language,
    }));
  }
}

// ─── Yjs Document Manager ──────────────────────────────────────────────

function getOrCreateDoc(docName) {
  let entry = docs.get(docName);
  if (entry) return entry;

  const doc = new Y.Doc({ gc: true });
  const awareness = new awarenessProtocol.Awareness(doc);
  awareness.setLocalState(null); // server has no cursor

  // Clean up awareness when client disconnects (handled in closeConn)
  const conns = new Map();
  entry = { doc, awareness, conns };
  docs.set(docName, entry);

  return entry;
}

function seedDoc(docName, content) {
  const entry = getOrCreateDoc(docName);
  const ytext = entry.doc.getText('monaco');
  if (ytext.length === 0 && content) {
    ytext.insert(0, content);
  }
  return entry;
}

function closeDocConn(docName, ws) {
  const entry = docs.get(docName);
  if (!entry) return;

  const controlledIds = entry.conns.get(ws);
  entry.conns.delete(ws);

  // Remove awareness states owned by this connection
  if (controlledIds && controlledIds.size > 0) {
    awarenessProtocol.removeAwarenessStates(
      entry.awareness,
      Array.from(controlledIds),
      null,
    );
  }

  // If no more connections, GC after timeout
  if (entry.conns.size === 0) {
    setTimeout(() => {
      const current = docs.get(docName);
      if (current && current.conns.size === 0) {
        current.awareness.destroy();
        current.doc.destroy();
        docs.delete(docName);
      }
    }, 30_000);
  }
}

// ─── Control Channel Handler ───────────────────────────────────────────

let peerCounter = 0;
function generatePeerId() {
  return `peer_${Date.now()}_${++peerCounter}`;
}

function handleControlConnection(ws, roomId) {
  const peerId = generatePeerId();
  let room = rooms.get(roomId);
  let joined = false;

  ws.on('message', (rawData) => {
    let msg;
    try {
      msg = JSON.parse(rawData.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      // ── Create room (become host) ────────────────────────────
      case 'create': {
        if (room) {
          sendJson(ws, { type: 'error', message: 'Room already exists' });
          return;
        }
        room = new Room(roomId);
        room.hostId = peerId;
        room.members.set(peerId, {
          ws,
          displayName: msg.displayName || 'Host',
          color: msg.color || '#FF6B6B',
        });
        rooms.set(roomId, room);
        joined = true;

        sendJson(ws, { type: 'room-created', peerId, roomId });
        room.broadcastMembersUpdate();
        break;
      }

      // ── Join room (request) ──────────────────────────────────
      case 'join': {
        if (!room) {
          sendJson(ws, { type: 'error', message: 'Room does not exist' });
          return;
        }
        // Add to pending
        room.pending.set(peerId, {
          ws,
          displayName: msg.displayName || 'Guest',
          color: msg.color || '#4ECDC4',
        });
        joined = true;

        sendJson(ws, { type: 'waiting-approval', peerId });

        // Notify host
        const host = room.members.get(room.hostId);
        if (host && host.ws.readyState === WebSocket.OPEN) {
          sendJson(host.ws, {
            type: 'join-request',
            peerId,
            displayName: msg.displayName,
            color: msg.color,
          });
        }
        room.broadcastMembersUpdate();
        break;
      }

      // ── Approve join ────────────────────────────────────────
      case 'approve': {
        if (!room || peerId !== room.hostId) return;
        const pendingMember = room.pending.get(msg.peerId);
        if (!pendingMember) return;

        room.pending.delete(msg.peerId);
        room.members.set(msg.peerId, pendingMember);

        // Send approval with list of shared files
        sendJson(pendingMember.ws, {
          type: 'approved',
          peerId: msg.peerId,
          sharedFiles: room.getSharedFilesList(),
        });
        room.broadcastMembersUpdate();
        break;
      }

      // ── Reject join ─────────────────────────────────────────
      case 'reject': {
        if (!room || peerId !== room.hostId) return;
        const rejected = room.pending.get(msg.peerId);
        if (!rejected) return;

        room.pending.delete(msg.peerId);
        sendJson(rejected.ws, { type: 'rejected' });
        room.broadcastMembersUpdate();
        break;
      }

      // ── Share a file (host only) ────────────────────────────
      case 'share-file': {
        if (!room || peerId !== room.hostId) return;
        const file = msg.file;
        if (!file || !file.id) return;

        room.sharedFiles.set(file.id, {
          id: file.id,
          name: file.name || 'untitled',
          language: file.language || '',
          content: file.content || '',
        });

        // Seed the Y.Doc with the file content
        const docName = `${roomId}/${file.id}`;
        seedDoc(docName, file.content || '');

        // Notify all members
        room.broadcastJson({
          type: 'file-shared',
          file: { id: file.id, name: file.name, language: file.language },
        });
        break;
      }

      // ── Reorder shared files (host only) ──────────────────────
      case 'reorder-files': {
        if (!room || peerId !== room.hostId) return;
        const newFilesList = msg.files;
        if (!Array.isArray(newFilesList)) return;

        const oldMap = room.sharedFiles;
        const newMap = new Map();
        for (const f of newFilesList) {
          const existing = oldMap.get(f.id);
          if (existing) {
            newMap.set(f.id, existing);
          }
        }
        room.sharedFiles = newMap;

        // Notify all members of the new order
        room.broadcastJson({
          type: 'files-reordered',
          sharedFiles: room.getSharedFilesList(),
        });
        break;
      }

      // ── Unshare a file (host only) ──────────────────────────
      case 'unshare-file': {
        if (!room || peerId !== room.hostId) return;
        const fileId = msg.fileId;
        if (!fileId || !room.sharedFiles.has(fileId)) return;

        room.sharedFiles.delete(fileId);

        // Notify all members
        room.broadcastJson({ type: 'file-unshared', fileId });

        // Clean up the Y.Doc
        const dName = `${roomId}/${fileId}`;
        const entry = docs.get(dName);
        if (entry) {
          // Close all connections to this doc
          for (const [conn] of entry.conns) {
            conn.close();
          }
          entry.awareness.destroy();
          entry.doc.destroy();
          docs.delete(dName);
        }
        break;
      }

      // ── Chat message ──────────────────────────────────────
      case 'chat-message': {
        if (!room || !room.members.has(peerId)) return;
        const text = (msg.text || '').trim();
        if (!text) return;

        const member = room.members.get(peerId);
        const chatMsg = {
          type: 'chat-message',
          id: `chat_${Date.now()}_${++peerCounter}`,
          peerId,
          displayName: member.displayName,
          color: member.color,
          text,
          timestamp: Date.now(),
        };
        // Broadcast to ALL members (including sender for confirmation)
        const data = JSON.stringify(chatMsg);
        for (const [, m] of room.members) {
          if (m.ws.readyState === WebSocket.OPEN) {
            m.ws.send(data);
          }
        }
        break;
      }

      // ── Leave ───────────────────────────────────────────────
      case 'leave': {
        handleDisconnect(ws, peerId, room);
        break;
      }
    }
  });

  ws.on('close', () => {
    if (joined && room) {
      handleDisconnect(ws, peerId, room);
    }
  });

  ws.on('error', () => {
    if (joined && room) {
      handleDisconnect(ws, peerId, room);
    }
  });
}

function handleDisconnect(ws, peerId, room) {
  if (!room) return;

  const wasMember = room.members.has(peerId);
  const member = room.members.get(peerId);
  const displayName = member?.displayName || room.pending.get(peerId)?.displayName || 'Unknown';

  room.members.delete(peerId);
  room.pending.delete(peerId);

  if (wasMember) {
    room.broadcastJson({ type: 'peer-left', peerId, displayName });
  }

  // If host left
  if (peerId === room.hostId) {
    if (room.members.size > 0) {
      // Promote first member to host
      const [newHostId] = room.members.keys();
      room.hostId = newHostId;
      const newHost = room.members.get(newHostId);
      if (newHost && newHost.ws.readyState === WebSocket.OPEN) {
        sendJson(newHost.ws, { type: 'promoted-to-host' });
      }
      room.broadcastMembersUpdate();
    } else {
      // Room empty — clean up
      // Reject all pending
      for (const [, p] of room.pending) {
        sendJson(p.ws, { type: 'room-closed' });
      }
      room.pending.clear();

      // Clean up all shared file docs
      for (const [fileId] of room.sharedFiles) {
        const dName = `${room.roomId}/${fileId}`;
        const entry = docs.get(dName);
        if (entry) {
          for (const [conn] of entry.conns) {
            conn.close();
          }
          entry.awareness.destroy();
          entry.doc.destroy();
          docs.delete(dName);
        }
      }
      rooms.delete(room.roomId);
    }
  } else {
    room.broadcastMembersUpdate();
  }
}

function sendJson(ws, msg) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

// ─── Yjs Document Channel Handler ──────────────────────────────────────

function handleDocConnection(ws, roomId, fileId) {
  const docName = `${roomId}/${fileId}`;
  const room = rooms.get(roomId);

  // Verify room exists and file is shared
  if (!room || !room.sharedFiles.has(fileId)) {
    ws.close(4001, 'File not shared');
    return;
  }

  const entry = getOrCreateDoc(docName);
  const { doc, awareness, conns } = entry;

  conns.set(ws, new Set());

  // ── Send initial sync ──────────────────────────────────────
  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_SYNC);
    syncProtocol.writeSyncStep1(encoder, doc);
    ws.send(encoding.toUint8Array(encoder), { binary: true });
  }

  // Send current awareness state
  const awarenessStates = awareness.getStates();
  if (awarenessStates.size > 0) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        awareness,
        Array.from(awarenessStates.keys()),
      ),
    );
    ws.send(encoding.toUint8Array(encoder), { binary: true });
  }

  // ── Handle incoming messages ───────────────────────────────
  ws.on('message', (rawData, isBinary) => {
    if (!isBinary) return; // Only accept binary

    const data = new Uint8Array(rawData);
    const decoder = decoding.createDecoder(data);
    const msgType = decoding.readVarUint(decoder);

    switch (msgType) {
      case MSG_SYNC: {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MSG_SYNC);
        syncProtocol.readSyncMessage(decoder, encoder, doc, ws);

        // Send reply (syncStep2) back to sender if any
        if (encoding.length(encoder) > 1) {
          ws.send(encoding.toUint8Array(encoder), { binary: true });
        }
        // Doc update handler below broadcasts to other clients automatically
        break;
      }

      case MSG_AWARENESS: {
        const update = decoding.readVarUint8Array(decoder);
        awarenessProtocol.applyAwarenessUpdate(awareness, update, ws);

        // Track which awareness client IDs this connection controls
        // so we can clean them up on disconnect
        const controlledIds = conns.get(ws);
        if (controlledIds) {
          // Parse the awareness update to extract client IDs
          const decoder2 = decoding.createDecoder(update);
          const len = decoding.readVarUint(decoder2);
          for (let i = 0; i < len; i++) {
            const clientID = decoding.readVarUint(decoder2);
            controlledIds.add(clientID);
            // Skip the clock and state data
            decoding.readVarUint(decoder2);
            decoding.readVarString(decoder2);
          }
        }
        // Awareness update handler below broadcasts to other clients
        break;
      }
    }
  });

  // ── Listen for doc updates and broadcast ───────────────────
  const updateHandler = (update, origin) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const msg = encoding.toUint8Array(encoder);

    for (const [conn] of conns) {
      if (conn !== origin && conn.readyState === WebSocket.OPEN) {
        conn.send(msg, { binary: true });
      }
    }
  };
  doc.on('update', updateHandler);

  // ── Listen for awareness changes ───────────────────────────
  const awarenessHandler = ({ added, updated, removed }, origin) => {
    const changedClients = [...added, ...updated, ...removed];
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients),
    );
    const msg = encoding.toUint8Array(encoder);

    for (const [conn] of conns) {
      if (conn !== origin && conn.readyState === WebSocket.OPEN) {
        conn.send(msg, { binary: true });
      }
    }
  };
  awareness.on('update', awarenessHandler);

  // ── Clean up on close ──────────────────────────────────────
  ws.on('close', () => {
    doc.off('update', updateHandler);
    awareness.off('update', awarenessHandler);
    closeDocConn(docName, ws);
  });

  ws.on('error', () => {
    doc.off('update', updateHandler);
    awareness.off('update', awarenessHandler);
    closeDocConn(docName, ws);
  });
}



// ─── HTTP Server + WebSocket Routing ───────────────────────────────────

const server = http.createServer((req, res) => {
  // Simple health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      rooms: rooms.size,
      docs: docs.size,
    }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // /room/:roomId — Control channel
  const roomMatch = pathname.match(/^\/room\/([^/]+)$/);
  if (roomMatch) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      const roomId = decodeURIComponent(roomMatch[1]);
      handleControlConnection(ws, roomId);
    });
    return;
  }

  // /doc/:roomId/:fileId — Yjs document channel
  const docMatch = pathname.match(/^\/doc\/([^/]+)\/([^/]+)$/);
  if (docMatch) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      const roomId = decodeURIComponent(docMatch[1]);
      const fileId = decodeURIComponent(docMatch[2]);
      handleDocConnection(ws, roomId, fileId);
    });
    return;
  }

  // Unknown path
  socket.destroy();
});

server.listen(PORT, () => {
  console.log(`⚡ CodeCollab Socket Server running on port ${PORT}`);
  console.log(`   Control:  ws://localhost:${PORT}/room/:roomId`);
  console.log(`   Yjs Doc:  ws://localhost:${PORT}/doc/:roomId/:fileId`);
});
