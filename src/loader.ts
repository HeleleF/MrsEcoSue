import WebSocket from 'ws';
import axios, { AxiosInstance } from 'axios';

import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';

import { APIResponse, delay } from './utils';
import { createWriteStream } from 'fs';
import { readFile } from 'fs/promises';
import { SECRETS } from './secrets';

export class Loader {
  private ws: WebSocket;
  private axios: AxiosInstance;
  private readonly ID_PATTERN = /<meta property="al:ios:url" content="[^\d\s]+(\d+)">/;
  private readonly CNT_PATTERN = /pages_count&quot;:(\d+)/;
  private readonly TITLE_PATTERN = /title&quot;:&quot;(.*)&quot;/;

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

  async get(uri: string) {

    try {
      const { data } = await this.axios.get<string>(uri);

      const [, pages] = data.match(this.CNT_PATTERN) ?? [];
      const [, sid] = data.match(this.ID_PATTERN) ?? [];
      const [, title] = data.match(this.TITLE_PATTERN) ?? [];
  
      if (!sid) return { error: 'No sid found!' };
      if (!pages) return { error: 'No page count found!' };

      return { metadata: { sid, pages, title: title ?? 'Sheet', tags: 'sheet piano' }};

    } catch (err) {
      console.log(err);
      return { error: 'Axios error' };
    }
  }

  async start(uri: string) {
    if (!uri) {
      this.ws.send('No data!');
      return;
    }

    console.log('Adding uri', uri);
    this.ws.send('Starting');

    const { metadata, error } = await this.get(uri);
  
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
        Keywords: tags,
      },
      margin: 0,
    });
    doc.pipe(createWriteStream('tmp.pdf'));

    const jobs = Array.from({ length: parseInt(pages, 10) }, async (_, idx) => {
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
