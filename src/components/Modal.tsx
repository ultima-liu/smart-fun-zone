import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

interface ModalProps {
  children: ReactNode;
  /** 点击遮罩关闭（可选） */
  onClose?: () => void;
}

/** 全屏弹窗：Portal 挂载到 body，避免被页面进场动画的 transform 限制尺寸 */
export default function Modal({ children, onClose }: ModalProps) {
  return createPortal(
    <div className="modal" onClick={onClose}>
      {children}
    </div>,
    document.body,
  );
}
