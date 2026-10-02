import { useI18n } from '../i18n';
import { useVoiceAvailability } from '../useVoiceAvailability';

/** 语音服务状态：显示当前朗读由火山 TTS 提供（与"唯一语音通道=火山"一致） */
export default function VoiceQualityTip() {
  const { t } = useI18n();
  const on = useVoiceAvailability();

  return (
    <div className={`voice-tip ${on ? 'natural' : 'none'}`}>
      {on ? <>✅ {t('voiceVolcOn')}</> : <>ℹ️ {t('voiceVolcOff')}</>}
    </div>
  );
}
