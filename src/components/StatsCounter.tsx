"use client";
import { useEffect, useState } from "react";
import type { Stats } from "@/lib/events";

export default function StatsCounter() {
    const [stats, setStats] = useState<Stats | null>(null);

    useEffect(() => {
        let cancelled = false;

        fetch("/api/stats")
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => {
                if (!cancelled && data) setStats(data);
            })
            .catch(() => {}); 

        return () => {
            cancelled = true;
        };
    }, []); 

    if (!stats) return null;

    return (
        <p>
            {stats.visits.toLocaleString()} visits · {stats.beatsServed.toLocaleString()} beats served
        </p>
    );
}
