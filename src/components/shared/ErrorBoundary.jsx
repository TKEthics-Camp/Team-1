import { Component } from "react";

// Wraps the whole app (see main.jsx) — including every provider — so it
// can't itself depend on any of them; a crash in a context is exactly the
// kind of thing this needs to survive. One uncaught render error used to
// white-screen the whole app with nothing a family could do about it but
// close the tab; this at least offers a reload.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Uncaught render error:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="stage" data-theme="white">
        <div className="app">
          <div className="view" style={{ alignItems: "center", justifyContent: "center", textAlign: "center", gap: 12 }}>
            <div style={{ fontSize: 40 }}>🌧️</div>
            <h1 style={{ fontFamily: "var(--display)", fontSize: 20 }}>Something went wrong</h1>
            <p className="sub">出错了。你的花园数据是安全的 — 请重新加载。</p>
            <p className="sub">Your garden's data is safe — try reloading.</p>
            <button className="btn" onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      </div>
    );
  }
}
