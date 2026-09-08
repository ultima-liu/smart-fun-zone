import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { volcConfigured } from '../speech';

/** 语音服务状态：显示当前朗读由火山 TTS 提供（与"唯一语音通道=火山"一致） */
export default function VoiceQualityTip() {
  const { t } = useI18n();
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(volcConfigured());
    // 服务端健康检查会回填真实配置状态，稍后再读一次
    const timer = window.setTimeout(() => setOn(volcConfigured()), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className={`voice-tip ${on ? 'natural' : 'none'}`}>
      {on ? <>✅ {t('voiceVolcOn')}</> : <>ℹ️ {t('voiceVolcOff')}</>}
    </div>
  );
}
