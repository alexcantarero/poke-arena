export { KpiCard, type KpiColor } from "./KpiCard";
export { TrendLineChart, type TrendPoint } from "./TrendLineChart";
export { HourlyChart, type HourlyPoint } from "./HourlyChart";
export { RankingBars, type RankingItem } from "./RankingBars";
export { SegmentedFilter, type FilterScope } from "./SegmentedFilter";

// Re-exportamos los componentes heredados de charts.tsx para preservar compatibilidad
export {
  EloChart,
  MetaChart,
  CpChart,
  seriesColor,
  type EloSeries,
  type MetaRow,
  type CpBar,
} from "../charts";

