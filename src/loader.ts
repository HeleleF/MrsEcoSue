import WebSocket from 'ws';
import axios, { AxiosInstance } from 'axios';
import { JSDOM } from 'jsdom';

import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';

import { MSEConfig, APIResponse } from './utils';
import { createWriteStream } from 'fs';
import { readFile } from 'fs/promises';
import { SECRETS } from './secrets';

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
      }
    });
  }

  private async extractMetadata(uri: string) {

    try {
      const { data } = await this.axios.get<string>(uri);
      const frag = JSDOM.fragment(data);

      const div = frag.querySelectorAll('div')[1];
      const attr = Object.values(div.dataset)[0] ?? '{}';

      const config = JSON.parse(attr) as MSEConfig;
      const { id, pages_count, title, tags } = config.store?.page?.data?.score ?? {};

      if (!id) {
        return { error: 'No sid found!' };
      }
      if (!pages_count) {
        return { error: 'No page count found!' };
      }

      return {
        metadata: {
          sid: id,
          pages: pages_count,
          title: title || 'Sheet',
          tags: tags ?? []
        }
      };

    } catch (err) {
      console.log(err);
      return { error: 'Axios error' };
    }
  }

  async createPDF(uri: string) {
    if (!uri) {
      this.ws.send('No data!');
      return;
    }

    console.log('Adding uri', uri);
    this.ws.send('Starting');

    const { metadata, error } = await this.extractMetadata(uri);
  
    if (error) {
      this.ws.send(error);
      return;
    }

    const { pages, sid, title, tags } = metadata!;

    const doc = new PDFDocument({
      layout: 'portrait',
      autoFirstPage: false,
      pdfVersion: '1.7ext3',
      info: {
        Title: title,
        Keywords: tags.join(' '),
      },
      margin: 0,
    });
    doc.pipe(createWriteStream('tmp.pdf'));

    const jobs = Array.from({ length: pages }, async (_, idx) => {
      const { data } = await this.axios.get<APIResponse>(
        `${SECRETS.MES_API_URL}?id=${sid}&index=${idx}&type=img&v2=1`,
        {
          headers: {
            Authorization: SECRETS.MES_API_TOKEN,
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
    });

    this.ws.send('Loading pages...');
    const result = await Promise.all(jobs).catch(_ => []);

    if (!result.length) {
      this.ws.send('Failed to get pages!');
      return; 
    }

    result.forEach((img) => {
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
    this.ws.send('Finished');
    const buf = await readFile('tmp.pdf');

    this.ws.send(buf);
  }
}
