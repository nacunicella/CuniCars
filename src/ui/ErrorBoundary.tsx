import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

// Evita que un fallo en una vista tumbe toda la app; muestra el detalle.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[CUNICARS] error en vista:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, color: "#f87171", fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap", overflow: "auto", height: "100%" }}>
          {String(this.state.error.stack || this.state.error.message)}
        </div>
      );
    }
    return this.props.children;
  }
}
