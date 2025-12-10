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
}

interface Bitrix24Response {
  result: Company[];
  next?: number;
  total?: number;
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

  async callBatch(commands: Record<string, string>): Promise<Record<string, Bitrix24Response>> {
    try {

      const response = await axios.post(`${this.webhookUrl}batch`, {
        cmd: commands,
        halt: 0
      });
      
      if (response.data.result && response.data.result.result) {
        return response.data.result.result; 
      }
      return {};
    } catch (error) {
       const err = error as Error;
       console.error('Ошибка Bitrix24 Batch:', err.message);
       throw error;
    }
  }

  async getAllCompanies(limit: number = 0): Promise<Company[]> {
    const uniqueCompanies = new Map<string, Company>();
    let start = 0;
    let finish = false;
    const BATCH_SIZE = 50; 
    let totalItems: number | null = null;

    while (!finish) {
      const commands: Record<string, string> = {};
      
      for (let i = 0; i < BATCH_SIZE; i++) {
        const currentStart = start + (i * 50);
        commands[`cmd_${i}`] = `crm.company.list?start=${currentStart}&select[]=ID&select[]=TITLE&order[ID]=ASC`;
      }

      const batchResult = await this.callBatch(commands);
      
      let batchFoundCount = 0;
      
      for (let i = 0; i < BATCH_SIZE; i++) {
        const cmdKey = `cmd_${i}`;
        const cmdResponse: any = batchResult[cmdKey]; 
        
        if (!cmdResponse) continue;

        if (totalItems === null && typeof cmdResponse.total === 'number') {
           totalItems = cmdResponse.total;
        }

        const items = Array.isArray(cmdResponse) ? cmdResponse : (cmdResponse.result || []);
        
        if (items.length > 0) {
          for (const item of items) {
            if (!uniqueCompanies.has(item.ID)) {
              uniqueCompanies.set(item.ID, item);
            }
          }
          batchFoundCount += items.length;
        }

        if (totalItems !== null && uniqueCompanies.size >= totalItems) {
           return Array.from(uniqueCompanies.values());
        }

        if (limit > 0 && uniqueCompanies.size >= limit) {
          return Array.from(uniqueCompanies.values()).slice(0, limit);
        }
      }

      if (batchFoundCount < (BATCH_SIZE * 50)) {
        finish = true;
      } else {
        start += (BATCH_SIZE * 50);
        if (totalItems !== null && start >= totalItems) {
            finish = true;
        } else {
            await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
    }

    return Array.from(uniqueCompanies.values());
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
