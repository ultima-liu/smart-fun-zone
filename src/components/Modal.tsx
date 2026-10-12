import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import ScreenPages from './ScreenPages';

interface ModalProps {
  children: ReactNode;
  /** 点击遮罩关闭（可选） */
  onClose?: () => void;
  controls?: ReactNode;
}

/** 全屏弹窗：Portal 挂载到 body，避免被页面进场动画的 transform 限制尺寸 */
export default function Modal({ children, onClose, controls }: ModalProps) {
  return createPortal(
    <div className="modal" onClick={onClose}>
      {controls}
      <ScreenPages panel>{children}</ScreenPages>
    </div>,
    document.body,
  );
}
