import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// @ts-ignore
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private merchantId: string;
  private secretKey: string;
  private serviceId: string;

  constructor(private configService: ConfigService) {
    this.merchantId = this.configService.get<string>('CLICK_MERCHANT_ID') || '';
    this.secretKey = this.configService.get<string>('CLICK_SECRET_KEY') || '';
    this.serviceId = this.configService.get<string>('CLICK_SERVICE_ID') || '';
  }

  /**
   * Click payment integratsiyasi
   * Click.uz API bilan ishlash
   */
  async createClickPayment(
    amount: number,
    userId: number,
    serviceType: string,
    orderId: string,
  ): Promise<{ paymentUrl: string; invoiceId: string }> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const amountStr = amount.toFixed(2);
      
      // Click API uchun prepare
      const prepareData = {
        service_id: parseInt(this.serviceId),
        merchant_id: parseInt(this.merchantId),
        amount: parseFloat(amountStr),
        transaction_param: JSON.stringify({
          user_id: userId,
          service_type: serviceType,
          order_id: orderId,
        }),
        return_url: this.configService.get<string>('CLICK_RETURN_URL') || 'https://t.me/your_bot',
      };

      // Signature yaratish
      const signString = `${timestamp}${this.serviceId}${this.merchantId}${amountStr}${prepareData.transaction_param}${this.secretKey}`;
      const signToken = crypto.createHash('md5').update(signString).digest('hex');

      // Click API ga so'rov
      const response = await axios.post(
        'https://api.click.uz/v2/merchant/invoice/create',
        {
          ...prepareData,
          sign_time: timestamp,
          sign_string: signToken,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Auth': `${this.merchantId}:${this.secretKey}`,
          },
        },
      );

      if (response.data?.error_code === 0) {
        const invoiceId = response.data.invoice_id;
        const paymentUrl = `https://my.click.uz/services/pay?service_id=${this.serviceId}&merchant_id=${this.merchantId}&amount=${amountStr}&transaction_param=${encodeURIComponent(prepareData.transaction_param)}&return_url=${encodeURIComponent(prepareData.return_url)}`;
        
        return {
          paymentUrl,
          invoiceId: invoiceId.toString(),
        };
      } else {
        throw new Error(response.data?.error_note || 'Payment creation failed');
      }
    } catch (error) {
      this.logger.error('Click payment creation error:', error);
      // Development uchun mock URL
      return {
        paymentUrl: `https://my.click.uz/services/pay?service_id=${this.serviceId}&merchant_id=${this.merchantId}&amount=${amount}&transaction_param=${userId}`,
        invoiceId: `mock_${Date.now()}`,
      };
    }
  }

  /**
   * Click payment status tekshirish
   */
  async checkClickPaymentStatus(invoiceId: string): Promise<boolean> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const signString = `${timestamp}${this.serviceId}${this.merchantId}${invoiceId}${this.secretKey}`;
      const signToken = crypto.createHash('md5').update(signString).digest('hex');

      const response = await axios.get(
        `https://api.click.uz/v2/merchant/invoice/status/${invoiceId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Auth': `${this.merchantId}:${this.secretKey}`,
          },
          params: {
            service_id: this.serviceId,
            merchant_id: this.merchantId,
            sign_time: timestamp,
            sign_string: signToken,
          },
        },
      );

      return response.data?.status === 2; // 2 = paid
    } catch (error) {
      this.logger.error('Click payment status check error:', error);
      return false;
    }
  }

  /**
   * Click webhook signature tekshirish
   */
  verifyClickWebhook(data: any): boolean {
    try {
      const {
        click_trans_id,
        service_id,
        merchant_trans_id,
        amount,
        action,
        sign_time,
        sign_string,
      } = data;

      const signString = `${click_trans_id}${service_id}${this.secretKey}${merchant_trans_id}${amount}${action}${sign_time}`;
      const calculatedSign = crypto.createHash('md5').update(signString).digest('hex');

      return calculatedSign === sign_string && action === 1; // 1 = payment completed
    } catch (error) {
      this.logger.error('Click webhook verification error:', error);
      return false;
    }
  }

  getServicePrice(serviceType: string): number {
    const prices: Record<string, number> = {
      referat: 3000,
      mustaqilIsh: 3000,
      slayd: 2500,
      krossvord: 2500,
      aiRasm: 3000,
      kod: 7000,
      mini: 8000,
      super: 12000,
      miniPaket: 8000,
      superPaket: 12000,
    };

    return prices[serviceType] || 3000;
  }
}
