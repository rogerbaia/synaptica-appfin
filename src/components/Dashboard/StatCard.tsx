"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string;
    subtext?: string;
    icon?: LucideIcon;
    trend?: 'up' | 'down' | 'neutral';
    colorClass?: string;
}

const StatCard = ({ label, value, subtext, icon: Icon, trend, colorClass = "text-[var(--text-color)]" }: StatCardProps) => {
    return (
        <div className="stat-card p-6 bg-white dark:bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm text-[var(--gray-color)] dark:text-gray-400 uppercase tracking-wider font-semibold">{label}</h3>
                {Icon && <Icon size={20} className={`${colorClass} opacity-80`} />}
            </div>

            <div className="flex flex-col items-start">
                <p className="text-2xl font-bold text-[var(--dark-color)] dark:text-white">{value}</p>

                {subtext && (
                    <p className="text-xs text-[var(--gray-color)] mt-1 flex items-center gap-1">
                        {subtext}
                    </p>
                )}
            </div>
        </div>
    );
};

export default StatCard;
