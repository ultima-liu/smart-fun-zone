import type { ReactNode } from 'react';

/** Content determines the layout: illustrated reading or an audio-and-text document. */
export default function EnglishReadingLayout({ picture, audio, children, footer }: {
  picture?: ReactNode; audio?: ReactNode; children?: ReactNode; footer?: ReactNode;
}) {
  return <div className={`en-material-layout ${picture ? 'en-material-layout--illustrated' : 'en-material-layout--text'}`}>
    {picture && <div className="en-material-picture">{picture}</div>}
    <div className="en-material-reading">
      {audio}
      {children && <div className="en-material-text">{children}</div>}
      {footer && <div className="en-reading-feedback">{footer}</div>}
    </div>
  </div>;
}
