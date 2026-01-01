import React, { memo, useCallback, useState, useEffect } from 'react';
import { Activity, RefreshCw, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { api } from '../../api/client';
import { formatRelativeTime } from '../../utils/helpers';
import { Button, Card, Spinner, Badge } from '../ui';
import { useToast } from '../../context/ToastContext';

const STATUS_CONFIG = {
  healthy: { icon: CheckCircle, color: 'success', label: 'Healthy' },
  ok: { icon: CheckCircle, color: 'success', label: 'OK' },
  degraded: { icon: AlertTriangle, color: 'warning', label: 'Degraded' },
  unhealthy: { icon: AlertCircle, color: 'error', label: 'Unhealthy' },
  error: { icon: AlertCircle, color: 'error', label: 'Error' },
};

/**
 * System health monitoring tab
 */
function HealthTab() {
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const toast = useToast();

  const fetchAllHealth = useCallback(async () => {
    setLoading(true);
    try {
      const [healthData, statsData, infoData] = await Promise.all([
        api.healthDetailed().catch(() => api.health()),
        api.stats().catch(() => null),
        api.info().catch(() => null),
      ]);

      setHealth(healthData);
      setStats(statsData);
      setInfo(infoData);
      setLastUpdated(new Date());
    } catch (err) {
      toast.error('Failed to fetch health status');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllHealth();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAllHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchAllHealth]);

  const getStatusConfig = (status) => {
    return STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.error;
  };

  const overallStatus = getStatusConfig(health?.status);
  const OverallIcon = overallStatus.icon;

  return (
    <div className="health-tab" role="region" aria-label="System health">
      <header className="tab-header">
        <h2 className="tab-title">
          <Activity size={24} aria-hidden="true" />
          System Health
        </h2>
        <div className="tab-header-actions">
          {lastUpdated && (
            <span className="health-updated">
              Updated {formatRelativeTime(lastUpdated)}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}
            onClick={fetchAllHealth}
            disabled={loading}
            aria-label="Refresh health status"
          >
            Refresh
          </Button>
        </div>
      </header>

      {loading && !health ? (
        <div className="health-loading">
          <Spinner size="lg" label="Loading health status..." />
        </div>
      ) : (
        <>
          <Card className="health-overview-card">
            <div className="health-overview">
              <div className="health-status-main" aria-live="polite">
                <OverallIcon
                  size={48}
                  className={`health-icon health-icon-${overallStatus.color}`}
                  aria-hidden="true"
                />
                <div className="health-status-info">
                  <h3 className="health-status-label">{overallStatus.label}</h3>
                  <p className="health-status-desc">
                    {health?.message || 'System is operating normally'}
                  </p>
                </div>
              </div>

              {info && (
                <div className="health-info">
                  <dl className="health-info-list">
                    {info.version && (
                      <>
                        <dt>Version</dt>
                        <dd>{info.version}</dd>
                      </>
                    )}
                    {info.uptime && (
                      <>
                        <dt>Uptime</dt>
                        <dd>{Math.floor(info.uptime / 3600)}h {Math.floor((info.uptime % 3600) / 60)}m</dd>
                      </>
                    )}
                  </dl>
                </div>
              )}
            </div>
          </Card>

          {health?.components && (
            <section aria-labelledby="components-heading">
              <h3 id="components-heading" className="health-section-title">
                Components
              </h3>
              <div className="health-components">
                {Object.entries(health.components).map(([name, component]) => {
                  const status = getStatusConfig(
                    typeof component === 'string' ? component : component?.status
                  );
                  const StatusIcon = status.icon;

                  return (
                    <Card key={name} className="health-component-card">
                      <div className="health-component">
                        <StatusIcon
                          size={20}
                          className={`health-icon health-icon-${status.color}`}
                          aria-hidden="true"
                        />
                        <span className="health-component-name">{name}</span>
                        <Badge variant={status.color} size="sm">
                          {status.label}
                        </Badge>
                      </div>
                      {typeof component === 'object' && component?.message && (
                        <p className="health-component-message">{component.message}</p>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {stats && (
            <section aria-labelledby="stats-heading">
              <h3 id="stats-heading" className="health-section-title">
                Statistics
              </h3>
              <div className="health-stats">
                {Object.entries(stats).map(([key, value]) => (
                  <Card key={key} className="health-stat-card">
                    <dt className="health-stat-label">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </dt>
                    <dd className="health-stat-value">
                      {typeof value === 'number' ? (
                        value.toLocaleString()
                      ) : typeof value === 'object' && value !== null ? (
                        <dl className="health-nested-stats">
                          {Object.entries(value).map(([k, v]) => (
                            <div key={k} className="health-nested-stat">
                              <dt>{k.replace(/_/g, ' ')}</dt>
                              <dd>{typeof v === 'number' ? v.toLocaleString() : String(v)}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        String(value)
                      )}
                    </dd>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default memo(HealthTab);
