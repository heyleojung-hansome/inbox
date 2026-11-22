"use client";

import { useState } from "react";

export default function Login() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="center-wrap">
      <form className="narrow card" onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: code }) });
        if (res.ok) location.href = "/";
        else { setError((await res.json()).error ?? "비밀번호가 맞지 않아요."); setBusy(false); }
      }}>
        <div className="brand" style={{ padding: 0 }}><div className="brand-mark">Ec</div><b>English Coach</b></div>
        <h1 style={{ fontSize: 22 }}>비밀번호를 입력해 주세요</h1>
        <p className="small muted">이 기기에서 한 번 입력하면 180일 동안 유지돼요.</p>
        <input id="passcode" className="text-input" type="password" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="current-password" autoFocus />
        {error && <div className="err">{error}</div>}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy || !code}>들어가기</button>
      </form>
    </div>
  );
}
