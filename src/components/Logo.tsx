import Mascot from './Mascot';
import { useI18n } from '../i18n';

export default function Logo({ size = 92 }: { size?: number }) {
  const { t } = useI18n();
  return (
    <div className="logo">
      <div className="logo-mascot">
        <Mascot pose="happy" size={size} />
        <span className="logo-bubble">{t('welcome').replace(/[！!]/g, '')}</span>
      </div>
      <div className="logo-text">
        <h1 className="logo-name">{t('appName')}</h1>
        <p className="logo-tag">{t('tagline')}</p>
      </div>
    </div>
  );
}
