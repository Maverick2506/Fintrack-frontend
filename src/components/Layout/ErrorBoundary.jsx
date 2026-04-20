import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught:", error, info);
    }
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md text-center">
            <h1 className="text-xl font-bold text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-300 mb-4">
              The app hit an unexpected error. Try reloading.
            </p>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
