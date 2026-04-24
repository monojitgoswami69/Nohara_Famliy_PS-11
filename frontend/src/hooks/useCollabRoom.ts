/**
 * useCollabRoom — React hook managing the collaborative editing session.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  CollabProvider, CollabMember, PendingRequest, CollabStatus,
  SharedFileInfo, CollabEvents, getRandomColor,
} from '../services/collabService';

export interface CollabToast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface CollabState {
  status: CollabStatus;
  roomId: string | null;
  isHost: boolean;
  displayName: string;
  color: string;
  members: CollabMember[];
  pending: PendingRequest[];
  sharedFiles: SharedFileInfo[];
  provider: CollabProvider | null;
  toasts: CollabToast[];
}

export function useCollabRoom() {
  const [state, setState] = useState<CollabState>({
    status: 'disconnected',
    roomId: null,
    isHost: false,
    displayName: '',
    color: getRandomColor(),
    members: [],
    pending: [],
    sharedFiles: [],
    provider: null,
    toasts: [],
  });

  const providerRef = useRef<CollabProvider | null>(null);

  // ── Toast helpers ────────────────────────────────────────────────────

  const addToast = useCallback((message: string, type: CollabToast['type'] = 'info') => {
    const id = Date.now().toString();
    setState(prev => ({
      ...prev,
      toasts: [...prev.toasts.slice(-4), { id, message, type }],
    }));
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        toasts: prev.toasts.filter(t => t.id !== id),
      }));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      toasts: prev.toasts.filter(t => t.id !== id),
    }));
  }, []);

  // ── Stable event handlers (use providerRef so they never go stale) ──

  const events: CollabEvents = {
    onStatusChange: (status: CollabStatus) => {
      const prov = providerRef.current;
      setState(prev => ({
        ...prev,
        status,
        isHost: prov?.isHost ?? prev.isHost,
      }));
    },
    onMembersUpdate: (members: CollabMember[], pending: PendingRequest[]) => {
      setState(prev => ({ ...prev, members, pending }));
    },
    onJoinRequest: (req: PendingRequest) => {
      addToast(`${req.displayName} wants to join`, 'info');
    },
    onPeerLeft: (_pid: string, name: string) => {
      addToast(`${name} left the room`, 'warning');
    },
    onPromotedToHost: () => {
      setState(prev => ({ ...prev, isHost: true }));
      addToast('You are now the host', 'success');
    },
    onError: (msg: string) => {
      addToast(msg, 'error');
    },
    onRoomClosed: () => {
      addToast('Room was closed by the host', 'error');
      providerRef.current = null;
      setState(prev => ({
        ...prev,
        status: 'disconnected',
        roomId: null,
        isHost: false,
        members: [],
        pending: [],
        sharedFiles: [],
        provider: null,
      }));
    },
    onFileShared: (file: SharedFileInfo) => {
      setState(prev => ({
        ...prev,
        sharedFiles: [...prev.sharedFiles, file],
      }));
      addToast(`"${file.name}" added to collab`, 'info');
    },
    onFileUnshared: (fileId: string) => {
      setState(prev => ({
        ...prev,
        sharedFiles: prev.sharedFiles.filter(f => f.id !== fileId),
      }));
      addToast('File removed from collab', 'warning');
    },
    onApproved: (sharedFiles: SharedFileInfo[]) => {
      setState(prev => ({ ...prev, sharedFiles }));
      addToast('You joined the room!', 'success');
    },
  };

  // ── Create room (user becomes host) ──────────────────────────────────

  const createRoom = useCallback((displayName: string, roomId: string) => {
    // Destroy previous provider if any
    providerRef.current?.destroy();

    const color = getRandomColor();
    const provider = new CollabProvider(roomId, displayName, color, events);
    providerRef.current = provider;

    setState(prev => ({
      ...prev,
      roomId,
      displayName,
      color,
      provider,
      isHost: true,
      status: 'connecting',
      members: [],
      pending: [],
      sharedFiles: [],
    }));

    provider.connect();
    provider.createRoom();
  }, []);

  // ── Join room ────────────────────────────────────────────────────────

  const joinRoom = useCallback((displayName: string, roomId: string) => {
    providerRef.current?.destroy();

    const color = getRandomColor();
    const provider = new CollabProvider(roomId, displayName, color, events);
    providerRef.current = provider;

    setState(prev => ({
      ...prev,
      roomId,
      displayName,
      color,
      provider,
      isHost: false,
      status: 'connecting',
      members: [],
      pending: [],
      sharedFiles: [],
    }));

    provider.connect();
    provider.joinRoom();
  }, []);

  // ── Leave room ───────────────────────────────────────────────────────

  const leaveRoom = useCallback(() => {
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
    }
    setState(prev => ({
      ...prev,
      status: 'disconnected',
      roomId: null,
      isHost: false,
      members: [],
      pending: [],
      sharedFiles: [],
      provider: null,
    }));
  }, []);

  // ── Host actions ─────────────────────────────────────────────────────

  const approveJoin = useCallback((peerId: string) => {
    providerRef.current?.approveJoin(peerId);
  }, []);

  const rejectJoin = useCallback((peerId: string) => {
    providerRef.current?.rejectJoin(peerId);
  }, []);

  const shareFile = useCallback((file: { id: string; name: string; language: string; content: string }) => {
    providerRef.current?.shareFile(file);
  }, []);

  const unshareFile = useCallback((fileId: string) => {
    providerRef.current?.unshareFile(fileId);
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────────

  useEffect(() => {
    return () => {
      providerRef.current?.destroy();
    };
  }, []);

  return {
    ...state,
    createRoom,
    joinRoom,
    leaveRoom,
    approveJoin,
    rejectJoin,
    shareFile,
    unshareFile,
    dismissToast,
  };
}
