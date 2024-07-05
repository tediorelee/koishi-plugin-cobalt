import { Context, Schema, h, pick } from 'koishi'
import { resolve } from 'path'
import {} from '@koishijs/plugin-console'

export const name = 'cobalt'

export interface Config {
  api: string,
  vQuality: string
}

export const Config = Schema.object({
  api: Schema.string().default('https://api.cobalt.tools/api/json').required().description('填写cobalt的api地址, 需要接上/api/json'),
  vQuality: Schema.string().default('720').description('清晰度(手机推荐720)，144 / ... / 2160 / max'),
  description: Schema.string().default('自行部署教程地址').description('https://github.com/imputnet/cobalt/blob/current/docs/run-an-instance.md'),
})


export function apply(ctx: Context, config: Config) {
  async function fetchFromAPI(url: string) {
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    const params = {
      url,
      vQuality: config.vQuality // set video quality default 1080p(if possible)
    };
    return await ctx.http.post(config.api, params, { headers });
  };

  ctx.command('cobalt <link:text>', '使用cobalt解析')
    .action(async ({session}, link) => {
      try {
        if (!link) return '缺少url链接!'
        const result = await fetchFromAPI(link)
        const {
          status, // error / redirect / stream / success / rate-limit / picker
          text,
          url,
          pickerType,
          picker,
          // audio
        } = result;

        switch (status) {
          case 'error':
            session.send(`下载错误: ${text}`);
            break;
          case 'redirect':
            session.send(h.video(url));
            break;
          case 'stream':
            const videoBuffer = await ctx.http.get<ArrayBuffer>(url, {
              responseType: 'arraybuffer',
            });
            session.send(h.video(videoBuffer, 'video/mp4'));
            break;
          case 'picker':
            picker.forEach(async item => {
              await session.send(h.video(item.url));
            });
            break;
        }
        
        
      } catch(err) {
        const {
          data: {
            status,
            text
          },
          status: code
        } = err?.response
        return `发生错误${code}! ${text}`;
      }
    });

  ctx.inject(['console'], (ctx) => {
    ctx.console.addEntry({
      dev: resolve(__dirname, '../client/index.ts'),
      prod: resolve(__dirname, '../dist'),
    })
  })
}
