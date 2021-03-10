import WebSocket from 'ws';
import axios, { AxiosInstance } from 'axios';
import { JSDOM } from 'jsdom';

import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';

import { MSEConfig, APIResponse, delay } from './utils';
import { SECRETS } from './secrets';
import { buffer as getBuffer } from 'get-stream';
import _chunk from 'lodash.chunk';

export class Loader {
  private ws: WebSocket;
  private axios: AxiosInstance;

  constructor(websocket: WebSocket) {
    this.ws = websocket;
    this.axios = axios.create({
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:81.0) Gecko/20100101 Firefox/81.0',
        'Accept-Language': 'en-US,en;q=0.8',
      },
      // proxy: {
      //   host: '127.0.0.1',
      //   port: 8888
      // }
    });
  }

  private async extractMetadata(uri: string) {
    try {
      const { data } = await this.axios.get<string>(uri);
      const frag = JSDOM.fragment(data);

      const div = frag.querySelectorAll('div')[1];
      const attr = Object.values(div.dataset)[0] ?? '{}';

      const config = JSON.parse(attr) as MSEConfig;
      const { id, pages_count, title, tags } =
        config.store?.page?.data?.score ?? {};

      if (!id) {
        return { error: 'No sid found!' };
      }
      if (!pages_count) {
        return { error: 'No page count found!' };
      }

      const { dimensions } =
        config.store?.jmuse_settings?.score_player?.json?.metadata ?? {};
      const [, width, height] = dimensions?.match(/^(\d+)x(\d+)$/) ?? [];

      // adding await fs.writeFile('test.json', attr) here causes the page request to auto-close ???? WHAT IN THE FUCK?

      return {
        metadata: {
          sid: id,
          pages: pages_count,
          title: title || 'Sheet',
          tags: tags ?? [],
          // string are implicitly coerced into numbers when using greater-than, so this works
          landscape: width > height,
        },
      };
    } catch (err) {
      console.log(err);
      return { error: `Axios error: ${err.code}` };
    }
  }

  private async loadPages(count: number, sid: number, uri: string) {

    this.ws.send(`${count} pages found`);

    const tasks = Array.from({ length: count }, (_, idx) => {
      return async () => {
        const { data } = await this.axios.get<APIResponse>(
          `${SECRETS.MES_API_URL}?id=${sid}&index=${idx}&type=img&v2=1`,
          {
            headers: {
              Authorization: SECRETS.MES_API_TOKEN,
              Referer: uri,
            },
          }
        );

        const sheetUrl = data?.info?.url;
        if (!sheetUrl) return null;

        if (sheetUrl.includes('svg')) {
          const { data: svg } = await this.axios.get<string>(sheetUrl);
          return svg;
        }

        const { data: arrBuf } = await this.axios.get<ArrayBuffer>(sheetUrl, {
          responseType: 'arraybuffer',
        });
        return Buffer.from(arrBuf);
      };
    });
    const results: (string | Buffer | null)[] = [];

    for (const chunk of _chunk(tasks, 10)) {

      try {

        this.ws.send(`Loading ${chunk.length} pages...`);

        const part = await Promise.all(chunk.map(task => task()));
        results.push(...part);

        this.ws.send(`Delaying...`);
        await delay();

      } catch (err) {
        console.log(err);
        return [];
      }

    }
    return results;
  }

  async createPDF(uri: string) {
    if (!uri) {
      this.ws.send('No data!');
      return;
    }
    if (!uri.startsWith(SECRETS.MES_DOMAIN)) {
      this.ws.send('Not a valid link!');
      return;
    }

    console.log('Adding uri', uri);
    this.ws.send('Starting');

    const { metadata, error } = await this.extractMetadata(uri);

    if (error) {
      this.ws.send(error);
      return;
    }

    const { pages, sid, title, tags, landscape } = metadata!;

    const result = await this.loadPages(pages, sid, uri);
    if (!result.length) {
      this.ws.send('Failed to get pages!');
      return;
    }

    const doc = new PDFDocument({
      layout: landscape ? 'landscape' : 'portrait',
      autoFirstPage: false,
      pdfVersion: '1.7ext3',
      info: {
        Title: title,
        Keywords: tags.join(' '),
      },
      margin: 0,
    });

    this.ws.send('Creating pdf...');
    result.forEach((img: string | Buffer | null) => {
      if (!img) return;

      doc.addPage();

      if ('string' === typeof img) {
        console.log('Adding svg...');

        SVGtoPDF(doc, img, 0, 0, {
          preserveAspectRatio: 'align',
        });
      } else {
        console.log('Adding png...');
        doc.image(img, { cover: [doc.page.width, doc.page.height] });
      }
    });
    doc.end();
    this.ws.send(await getBuffer(doc));
  }
}
