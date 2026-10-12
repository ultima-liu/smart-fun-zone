"""Download the 74 official PEP recordings and PDF using the user's login header.

Credentials are read from a local file, never written to the manifest or logs.
The original downloads remain outside the application; this does not publish assets.
"""
import argparse
import base64
import concurrent.futures
import hashlib
import hmac
import json
import pathlib
import re
import secrets
import time
import urllib.parse
import urllib.request

CONTENT_ID = 'dd6173ba-579a-356e-900c-cb53e152229c'
ROOT = 'https://s-file-1.ykt.cbern.com.cn/zxx'


def read_json(url):
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.load(response)


def auth_header(path):
    text = path.read_text().strip()
    if text.startswith('{'):
        credentials = json.loads(text)
        if credentials.get('access_token'):
            return credentials
        text = credentials.get('X-ND-AUTH', '')
    text = re.sub(r'^X-ND-AUTH\s*:\s*', '', text, flags=re.I)
    if not text.startswith('MAC ') or '\n' in text or '\r' in text:
        raise ValueError('请使用完整的 X-ND-AUTH 请求头值（MAC 开头），而不是登录密码。')
    return {'X-ND-AUTH': text}


def download(item, destination, auth):
    expected = item.get('ti_md5')
    if destination.exists() and expected and hashlib.md5(destination.read_bytes()).hexdigest() == expected:
        return
    url = item['ti_storages'][0]
    if urllib.parse.urlsplit(url).hostname not in {
        f'r{i}-ndr-private.ykt.cbern.com.cn' for i in range(1, 4)
    }:
        raise ValueError('音频存储域名已变更，请重新核对官方来源。')
    # URL paths supplied by the official catalog can contain spaces and Chinese.
    url = urllib.parse.quote(url, safe=':/?=&%')
    headers = {'Referer': 'https://basic.smartedu.cn/'}
    if auth.get('mac_key'):
        parsed = urllib.parse.urlsplit(url)
        nonce = f'{int(time.time() * 1000) + int(auth.get("diff", 0))}:{secrets.token_hex(4)}'
        signing = f'{nonce}\nGET\n{urllib.parse.unquote(parsed.path)}\n{parsed.netloc}\n'
        mac = base64.b64encode(hmac.new(auth['mac_key'].encode(), signing.encode(), hashlib.sha256).digest()).decode()
        headers['X-ND-AUTH'] = f'MAC id="{auth["access_token"]}",nonce="{nonce}",mac="{mac}"'
    elif 'access_token' in auth:
        url += '?' + urllib.parse.urlencode({'accessToken': auth['access_token']})
    else:
        headers.update(auth)
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=60) as response:
        data = response.read()
    if expected and hashlib.md5(data).hexdigest() != expected:
        raise ValueError(f'{destination.name}: 文件校验失败')
    temporary = destination.with_suffix(destination.suffix + '.part')
    temporary.write_bytes(data)
    temporary.replace(destination)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--auth-file', type=pathlib.Path, required=True)
    parser.add_argument('--output', type=pathlib.Path, default=pathlib.Path.home() / 'Downloads/课本/英语/上册官方原声')
    args = parser.parse_args()
    auth = auth_header(args.auth_file)
    audios = read_json(f'{ROOT}/ndrs/resources/{CONTENT_ID}/relation_audios.json')
    book = read_json(f'{ROOT}/ndrv2/resources/tch_material/details/{CONTENT_ID}.json')
    if len(audios) != 74:
        raise ValueError('官方音频目录已变更，请重新核对教材匹配。')
    args.output.mkdir(parents=True, exist_ok=True)
    jobs, manifest = [], []
    for index, audio in enumerate(audios, 1):
        # Full transcoded recording, never the preview clip or OGG alternative.
        item = next(t for t in audio['ti_items'] if t.get('lc_ti_format') == 'audio/mp3'
                    and '/transcode/audios/' in t['ti_storages'][0] and '/clip-' not in t['ti_storages'][0])
        title = audio['global_title']['zh-CN']
        filename = f'{index:02d} {title}.mp3'
        jobs.append((item, args.output / filename))
        manifest.append({'id': audio['id'], 'title': title, 'filename': filename,
                         'md5': item.get('ti_md5'), 'bytes': item.get('ti_size')})
    pdf = next(t for t in book['ti_items'] if 'pdf' in t.get('lc_ti_format', ''))
    jobs.append((pdf, args.output / '英语（PEP）三年级上册.pdf'))
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(download, item, path, auth) for item, path in jobs]
        for index, future in enumerate(concurrent.futures.as_completed(futures), 1):
            future.result()
            print(f'已校验 {index}/{len(jobs)}', flush=True)
    (args.output / '来源目录.json').write_text(json.dumps({
        'contentId': CONTENT_ID, 'source': f'https://basic.smartedu.cn/tchMaterial/detail?contentType=assets_document&contentId={CONTENT_ID}',
        'audio': manifest, 'pdfMd5': pdf.get('ti_md5'),
    }, ensure_ascii=False, indent=2) + '\n')
    print(f'完成：74 段 MP3 和教材 PDF，保存于 {args.output}')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Never echo HTTP request headers, URLs containing credentials, or file contents.
        raise SystemExit(f'下载失败：{type(error).__name__} {error}') from None
