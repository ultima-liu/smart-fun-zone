import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import EnglishSingleLineText from './EnglishSingleLineText';
import { IconCourseSpeaker } from './icons';
import './english-reading-line.css';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  text: string;
  marker?: ReactNode;
  picture?: ReactNode;
  speaker?: string;
  example?: string;
};

/** A point-reading action belongs to the text line, without a separate sentence card. */
const EnglishReadingLine = forwardRef<HTMLButtonElement, Props>(function EnglishReadingLine(
  { text, marker, picture, speaker, example, className = '', ...buttonProps }, ref,
) {
  return <button {...buttonProps} ref={ref} type="button" data-tab-audio className={`en-reading-line ${className}`}>
    {marker != null && <i className="en-source-marker" aria-hidden="true">{marker}</i>}
    {picture}
    <span className="en-source-text">
      {speaker && <small>{speaker}</small>}
      <strong lang={buttonProps.lang ?? 'en'}><EnglishSingleLineText>{text}</EnglishSingleLineText></strong>
      {example && <small><EnglishSingleLineText>{example}</EnglishSingleLineText></small>}
    </span>
    <i className="en-source-sound" aria-hidden="true"><IconCourseSpeaker size={18} /></i>
  </button>;
});

export default EnglishReadingLine;
