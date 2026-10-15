import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { cn } from '@/utils/utils';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    description?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
}

export const StatsCard = ({
    title,
    value,
    icon: Icon,
    description,
    trend,
    className
}: StatsCardProps) => {
    return (
        <Card className={cn("overflow-hidden", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {description}
                    </p>
                )}
                {trend && (
                    <div className={cn(
                        "flex items-center text-xs mt-2 font-medium",
                        trend.isPositive ? "text-emerald-500" : "text-rose-500"
                    )}>
                        {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
                        <span className="text-muted-foreground ml-1">from last month</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
