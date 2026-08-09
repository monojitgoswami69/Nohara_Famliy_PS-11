"""
CodeCollab Real Compiler Execution Router
Executes real code via local CLI subprocess or Piston Sandboxed Compiler API.
"""

import subprocess
import sys
import tempfile
import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class ExecutionRequest(BaseModel):
    language: str
    code: str
    stdin: Optional[str] = ""

class ExecutionResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    execution_time_ms: float
    engine: str

# Piston Language Map
PISTON_LANG_MAP = {
    "javascript": "javascript",
    "js": "javascript",
    "typescript": "typescript",
    "ts": "typescript",
    "python": "python",
    "py": "python",
    "c": "c",
    "cpp": "cpp",
    "c++": "cpp",
    "java": "java",
    "go": "go",
    "rust": "rust",
    "ruby": "ruby",
    "php": "php",
}

@router.post("", response_model=ExecutionResponse)
async def execute_code(req: ExecutionRequest):
    lang = req.language.lower().strip()
    code = req.code

    if not code or not code.strip():
        return ExecutionResponse(
            stdout="",
            stderr="Source code is empty.",
            exit_code=1,
            execution_time_ms=0,
            engine="empty-check"
        )

    # 1. Try Local Execution for Python / Node.js
    if lang in ["python", "py"]:
        try:
            import time
            start = time.perf_counter()
            proc = subprocess.run(
                [sys.executable, "-c", code],
                input=req.stdin,
                capture_output=True,
                text=True,
                timeout=5
            )
            duration = (time.perf_counter() - start) * 1000
            return ExecutionResponse(
                stdout=proc.stdout,
                stderr=proc.stderr,
                exit_code=proc.returncode,
                execution_time_ms=round(duration, 2),
                engine="local-python"
            )
        except subprocess.TimeoutExpired:
            return ExecutionResponse(
                stdout="",
                stderr="Execution timed out (5s limit).",
                exit_code=124,
                execution_time_ms=5000,
                engine="local-python-timeout"
            )
        except Exception as e:
            pass # Fallback to Piston API

    elif lang in ["javascript", "js"]:
        try:
            import time
            start = time.perf_counter()
            proc = subprocess.run(
                ["node", "-e", code],
                input=req.stdin,
                capture_output=True,
                text=True,
                timeout=5
            )
            duration = (time.perf_counter() - start) * 1000
            return ExecutionResponse(
                stdout=proc.stdout,
                stderr=proc.stderr,
                exit_code=proc.returncode,
                execution_time_ms=round(duration, 2),
                engine="local-node"
            )
        except Exception:
            pass # Fallback to Piston API

    # 2. Piston Sandbox API (Real Compilers for C, C++, Rust, Go, Java, TS, etc.)
    piston_lang = PISTON_LANG_MAP.get(lang, lang)
    try:
        import time
        start = time.perf_counter()
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                "https://emkc.org/api/v2/piston/execute",
                json={
                    "language": piston_lang,
                    "version": "*",
                    "files": [{"content": code}],
                    "stdin": req.stdin or "",
                }
            )
            duration = (time.perf_counter() - start) * 1000
            if res.status_code == 200:
                data = res.json()
                run_data = data.get("run", {})
                return ExecutionResponse(
                    stdout=run_data.get("stdout", ""),
                    stderr=run_data.get("stderr", ""),
                    exit_code=run_data.get("code", 0),
                    execution_time_ms=round(duration, 2),
                    engine=f"piston-sandbox ({data.get('language', piston_lang)} {data.get('version', '')})"
                )
    except Exception as e:
        pass

    return ExecutionResponse(
        stdout="",
        stderr="Execution failed: No compiler runtime available for this language.",
        exit_code=1,
        execution_time_ms=0,
        engine="failed"
    )
