import express, { Request, Response } from 'express';
import cors from 'cors';
import axios, { AxiosResponse } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT: number = parseInt(process.env.PORT || '3001', 10);
const BITRIX24_WEBHOOK_URL: string = process.env.BITRIX24_WEBHOOK_URL || '';

app.use(cors());
app.use(express.json());

interface Company {
  ID: string;
  TITLE: string;
  // Сюда можно добавить другие поля/Сделать выбор через кнопку, если нужно, могу сделать
}

interface Bitrix24Response {
  result: Company[];
  next?: number;
  total?: number;
  // Скорее всего можно использовать batch, как потенциальный фикс рейт лимита, если таковой будет
  // В свои моковые компании я вставил 400 позиций, скорость удовлетворяет 
}

interface ApiResponse {
  success: boolean;
  count?: number;
  data?: Company[];
  error?: string;
}

class Bitrix24API {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl.endsWith('/') ? webhookUrl : webhookUrl + '/';
  }

  async call(method: string, params: Record<string, unknown> = {}): Promise<Bitrix24Response> {
    try {
      const response: AxiosResponse<Bitrix24Response> = await axios.post(
        `${this.webhookUrl}${method}`,
        params
      );
      return response.data;
    } catch (error) {
      const err = error as Error;
      console.error(`Ошибка Bitrix24 API (${method}):`, err.message);
      throw error;
    }
  }

  async getAllCompanies(limit: number = 0): Promise<Company[]> {
    const allCompanies: Company[] = [];
    let start = 0;

    while (true) {
      const response = await this.call('crm.company.list', {
        start: start,
        select: ['ID', 'TITLE']
      });

      const companies = response.result || [];

      if (companies.length === 0) {
        break;
      }

      allCompanies.push(...companies);

      if (limit > 0 && allCompanies.length >= limit) {
        return allCompanies.slice(0, limit);
      }

      if (!response.next) {
        break;
      }

      start = response.next;

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return allCompanies;
  }
}

const bitrix24 = new Bitrix24API(BITRIX24_WEBHOOK_URL);

app.get('/api/companies', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 0;
    const companies = await bitrix24.getAllCompanies(limit);

    res.json({
      success: true,
      count: companies.length,
      data: companies
    });
  } catch (error) {
    const err = error as Error;
    console.error('Ошибка при получении компаний:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Ошибка при получении данных из Bitrix24'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
