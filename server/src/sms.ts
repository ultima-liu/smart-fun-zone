/* =====================================================================
   短信服务（可插拔）
   - mock：开发态默认，验证码固定 config.smsMockCode，打印到日志
   - aliyun：阿里云短信服务（HTTP 签名请求）
   新增提供商只需实现 sendCode 并注册到 providers。
   ===================================================================== */
import crypto from 'node:crypto';
import { config } from './config.js';

export interface SmsProvider {
  name: string;
  sendCode(phone: string, code: string): Promise<void>;
}

/* ---------- mock ---------- */
const mockProvider: SmsProvider = {
  name: 'mock',
  async sendCode(phone, code) {
    console.log(`[sms:mock] 向 ${phone} 发送验证码：${code}（开发态，实际不发送）`);
  },
};

/* ---------- 阿里云短信 ---------- */
interface AliyunCfg {
  accessKeyId: string;
  accessKeySecret: string;
  signName: string;
  templateCode: string;
  endpoint: string;
}

function aliyunSign(cfg: AliyunCfg, params: Record<string, string>): string {
  // 阿里云短信 API 的 HMAC-SHA1 签名（RFC 格式，含特殊字符处理）
  const sorted = Object.keys(params).sort();
  const canonical = sorted
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k]).replace(/\+/g, '%20').replace(/\*/g, '%2A').replace(/%7E/g, '~')}`)
    .join('&');
  const stringToSign = `GET&%2F&${encodeURIComponent(canonical).replace(/\+/g, '%20').replace(/\*/g, '%2A').replace(/%7E/g, '~')}`;
  const h = crypto.createHmac('sha1', `${cfg.accessKeySecret}&`);
  h.update(stringToSign);
  return h.digest('base64');
}

function aliyunProvider(cfg: AliyunCfg): SmsProvider {
  return {
    name: 'aliyun',
    async sendCode(phone, code) {
      const params: Record<string, string> = {
        AccessKeyId: cfg.accessKeyId,
        Action: 'SendSms',
        Format: 'JSON',
        PhoneNumbers: phone,
        RegionId: 'cn-hangzhou',
        SignName: cfg.signName,
        SignatureMethod: 'HMAC-SHA1',
        SignatureNonce: crypto.randomUUID(),
        SignatureVersion: '1.0',
        TemplateCode: cfg.templateCode,
        TemplateParam: JSON.stringify({ code }),
        Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
        Version: '2017-05-25',
      };
      params.Signature = aliyunSign(cfg, params);
      const qs = Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      const res = await fetch(`${cfg.endpoint}/?${qs}`);
      if (!res.ok) throw new Error(`aliyun sms http ${res.status}`);
      const body = (await res.json()) as { Code?: string; Message?: string };
      if (body.Code !== 'OK') {
        throw new Error(`aliyun sms 发送失败: ${body.Code} ${body.Message ?? ''}`);
      }
      console.log(`[sms:aliyun] 已向 ${phone} 发送验证码`);
    },
  };
}

/* ---------- 注册与选择 ---------- */
const providers: Record<string, () => SmsProvider> = {
  mock: () => mockProvider,
  aliyun: () =>
    aliyunProvider({
      accessKeyId: process.env.ALIYUN_SMS_ACCESS_KEY_ID ?? '',
      accessKeySecret: process.env.ALIYUN_SMS_ACCESS_KEY_SECRET ?? '',
      signName: process.env.ALIYUN_SMS_SIGN_NAME ?? '',
      templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE ?? '',
      endpoint: process.env.ALIYUN_SMS_ENDPOINT ?? 'https://dysmsapi.aliyuncs.com',
    }),
};

export function smsProvider(): SmsProvider {
  const name = process.env.SMS_PROVIDER ?? 'mock';
  return (providers[name] ?? providers.mock)();
}
