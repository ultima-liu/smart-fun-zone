import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';

const NATURAL = /xiaoxiao|yunxi|xiaoyi|yunyang|natural|aria|jenny|sonja|guy/i;

/** 检测当前中文系统语音：若不是自然语音，提示如何安装（多音字更准、音质更自然） */
export default function VoiceQualityTip() {
  const { t } = useI18n();
  const [state, setState] = useState<'natural' | 'robotic' | 'none'>('none');

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const check = () => {
      const zh = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('zh') && v.localService);
      if (zh.length === 0) {
        setState('none');
        return;
      }
      const natural = zh.find((v) => NATURAL.test(v.name));
      setState(natural ? 'natural' : 'robotic');
    };
    check();
    window.speechSynthesis.onvoiceschanged = check;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  return (
    <div className={`voice-tip ${state}`}>
      {state === 'natural' && <>✅ {t('voiceNatural')}</>}
      {state === 'robotic' && <>⚠️ {t('voiceTip')}</>}
      {state === 'none' && <>ℹ️ {t('voiceBuiltin')}</>}
    </div>
  );
}
