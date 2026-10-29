import StoreChrome from '@/components/store/StoreChrome';
import TradeCenter from '@/components/store/TradeCenter';

export const metadata = {
  title: 'JOLOF TRADE CENTER | Global Commodity Trading — From Africa to the World',
  description: 'JOLOF TRADE CENTER is an international commodity trading company with offices in Dakar, Senegal, and New York, United States, connecting Africa’s resources with international markets.',
};

export default function TradingPage() {
  return (
    <StoreChrome>
      <TradeCenter />
    </StoreChrome>
  );
}
