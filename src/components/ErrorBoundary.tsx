import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import Mascot from './Mascot';
import { useStore } from '../store';
import { playSfx } from '../speech';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** 全局错误兜底：友好提示 + 一键恢复，避免白屏 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[SmartFunZone] render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const zh = useStore.getState().lang === 'zh';
      return (
        <div className="error-screen">
          <Mascot pose="sad" size={128} />
          <h2>{zh ? '哎呀，出小差了！' : 'Oops, something went wrong!'}</h2>
          <p>{zh ? '别担心，点一下按钮就能继续玩' : 'Tap the button to keep playing'}</p>
          <button
            className="kid-btn coral"
            onClick={() => {
              playSfx('tap');
              this.setState({ hasError: false });
            }}
          >
            {zh ? '再试一次' : 'Try again'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
