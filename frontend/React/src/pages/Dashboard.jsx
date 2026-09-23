import React, { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material'
import {
  WaterDrop,
  Warning,
  People,
  Sms,
  TrendingUp,
  CheckCircle,
  Error,
  Download,
} from '@mui/icons-material'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../services/api'

const Dashboard = () => {
  console.log('Dashboard component mounting...')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [waterLevelTrend, setWaterLevelTrend] = useState([])
  const [exporting, setExporting] = useState(false)
  const [alertHistory, setAlertHistory] = useState([])

  const formatTelemetryTimestamp = (value) => {
    if (!value) return 'N/A'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).replace(',', ' | ')
  }

  const getAlertAction = (status) => {
    switch (status) {
      case 'Danger':
        return 'Emergency SMS Broadcast Sent'
      case 'Warning':
        return 'Warning Issued'
      default:
        return 'Normal Monitoring'
    }
  }

  useEffect(() => {
    console.log('Dashboard useEffect triggered')
    fetchDashboardData()
    fetchWaterLevelTrend()
    
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData()
      fetchWaterLevelTrend()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const applyCurrentWaterLevel = (incomingWaterLevel) => {
    setDashboardData((prev) => {
      const previousLevel = prev?.current_water_level ?? {}
      const incomingLevel = incomingWaterLevel ?? {}

      const previousTimestamp = previousLevel?.timestamp
        ? new Date(previousLevel.timestamp).getTime()
        : Number.NEGATIVE_INFINITY
      const incomingTimestamp = incomingLevel?.timestamp
        ? new Date(incomingLevel.timestamp).getTime()
        : Number.NEGATIVE_INFINITY

      const chosenCurrentWaterLevel = incomingLevel?.timestamp && incomingTimestamp >= previousTimestamp
        ? incomingLevel
        : previousLevel

      return {
        ...(prev ?? {}),
        current_water_level: chosenCurrentWaterLevel,
      }
    })
  }

  useEffect(() => {
    const fetchLatestWaterLevel = async () => {
      try {
        const response = await api.get('/api/water-level/latest/')
        const latest = response.data
        const liveReading = {
          raw: latest.raw == null ? null : Number(latest.raw),
          water_level_cm: Number(latest.water_level_cm),
          status: latest.status,
          sensor_status: latest.sensor_status,
          gsm_status: latest.gsm_status,
          timestamp: latest.timestamp,
          source: latest.source,
          age_seconds: latest.age_seconds,
          is_live: latest.is_live === true,
        }

        setAlertHistory((prev) => {
          const candidate = {
            timestamp: liveReading.timestamp,
            water_level_cm: liveReading.water_level_cm,
            raw: liveReading.raw,
            status: liveReading.status,
            action: getAlertAction(liveReading.status),
          }

          const exists = prev.some((entry) => entry.timestamp === candidate.timestamp && entry.status === candidate.status)
          if (exists) return prev

          return [candidate, ...prev].slice(0, 8)
        })

        applyCurrentWaterLevel(liveReading)
      } catch (err) {
        console.error('Failed to fetch latest water level:', err)
      }
    }

    fetchLatestWaterLevel()
    const latestInterval = setInterval(fetchLatestWaterLevel, 5000)

    return () => clearInterval(latestInterval)
  }, [])

  useEffect(() => {
    if (!dashboardData?.current_water_level) return

    const currentReading = dashboardData.current_water_level
    setAlertHistory((prev) => {
      const candidate = {
        timestamp: currentReading.timestamp,
        water_level_cm: Number(currentReading.water_level_cm ?? 0),
        raw: Number(currentReading.raw ?? currentReading.water_level_cm ?? 0),
        status: currentReading.status ?? 'Normal',
        action: getAlertAction(currentReading.status ?? 'Normal'),
      }

      const exists = prev.some((entry) => entry.timestamp === candidate.timestamp && entry.status === candidate.status)
      if (exists) return prev

      return [candidate, ...prev].slice(0, 8)
    })
  }, [dashboardData?.current_water_level?.timestamp, dashboardData?.current_water_level?.status, dashboardData?.current_water_level?.water_level_cm])

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/api/dashboard/overview/')
      console.log('Dashboard data:', response.data)

      setDashboardData((prev) => {
        const previousLevel = prev?.current_water_level ?? {}
        const incomingLevel = response.data?.current_water_level ?? {}
        const previousTimestamp = previousLevel?.timestamp
          ? new Date(previousLevel.timestamp).getTime()
          : Number.NEGATIVE_INFINITY
        const incomingTimestamp = incomingLevel?.timestamp
          ? new Date(incomingLevel.timestamp).getTime()
          : Number.NEGATIVE_INFINITY

        const chosenCurrentWaterLevel = incomingLevel?.timestamp && incomingTimestamp >= previousTimestamp
          ? incomingLevel
          : previousLevel

        return {
          ...response.data,
          current_water_level: chosenCurrentWaterLevel,
        }
      })
      setError(null)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError('Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchWaterLevelTrend = async () => {
    try {
      const response = await api.get('/api/dashboard/water-level-trend/?hours=24')
      const formattedData = response.data.map(item => ({
        time: new Date(item.timestamp).toLocaleTimeString(),
        level: item.water_level_cm
      }))
      setWaterLevelTrend(formattedData)
    } catch (err) {
      console.error('Failed to fetch water level trend:', err)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Normal':
        return 'success'
      case 'Alert':
        return 'info'
      case 'Warning':
        return 'warning'
      case 'Danger':
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Normal':
        return <CheckCircle color="success" />
      case 'Alert':
        return <Info color="info" />
      case 'Warning':
        return <Warning color="warning" />
      case 'Danger':
        return <Error color="error" />
      default:
        return <Info />
    }
  }

  const handleExportReport = async () => {
    setExporting(true)
    try {
      const response = await api.get('/api/reports/export/', {
        responseType: 'blob',
      })
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `flood_report_${new Date().toISOString().split('T')[0]}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
      alert('Failed to export report. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading dashboard data...</Typography>
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  console.log('Rendering Dashboard with data:', dashboardData)

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Real-time flood monitoring overview
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={exporting ? <CircularProgress size={20} color="inherit" /> : <Download />}
          onClick={handleExportReport}
          disabled={exporting}
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1.5,
            minWidth: 180,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          {exporting ? 'Exporting...' : 'Export Report'}
        </Button>
      </Box>
      
      {/* Rule of Thirds Layout - 3x3 Grid */}
      <Grid container spacing={3}>
        {/* TOP ROW - Critical KPIs at top intersections */}
        {/* Current Water Level - Top Left */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)', height: '100%', transition: 'box-shadow 0.3s', '&:hover': { boxShadow: '0 3px 6px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.23)' } }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="caption" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Current Water Level
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {dashboardData?.current_water_level?.water_level_cm || 0} cm
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Raw ADC: {dashboardData?.current_water_level?.raw ?? 'N/A'} | Sensor: {dashboardData?.current_water_level?.sensor_status || 'unknown'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Last Arduino update: {dashboardData?.current_water_level?.timestamp
                      ? new Date(dashboardData.current_water_level.timestamp).toLocaleTimeString()
                      : 'No reading'}
                  </Typography>
                  <Typography
                    variant="caption"
                    color={dashboardData?.current_water_level?.is_live ? 'success.main' : 'error.main'}
                    display="block"
                    sx={{ fontWeight: 700, mt: 0.25 }}
                  >
                    {dashboardData?.current_water_level?.is_live
                      ? 'LIVE FROM ARDUINO'
                      : 'STALE: WAITING FOR ARDUINO'}
                  </Typography>
                  <Chip
                    label={dashboardData?.current_water_level?.status || 'Unknown'}
                    color={getStatusColor(dashboardData?.current_water_level?.status)}
                    size="small"
                    sx={{ mt: 1.5, height: 24 }}
                    icon={getStatusIcon(dashboardData?.current_water_level?.status)}
                  />
                </Box>
                <WaterDrop sx={{ fontSize: 40, color: 'primary.main', opacity: 0.9 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Alerts - Top Center */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)', height: '100%', transition: 'box-shadow 0.3s', '&:hover': { boxShadow: '0 3px 6px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.23)' } }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="caption" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Active Alerts
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {dashboardData?.alerts?.active_count || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    {dashboardData?.alerts?.recent_count || 0} in last 24h
                  </Typography>
                </Box>
                <Warning sx={{ fontSize: 40, color: 'warning.main', opacity: 0.9 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Residents - Top Right */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)', height: '100%', transition: 'box-shadow 0.3s', '&:hover': { boxShadow: '0 3px 6px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.23)' } }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="caption" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Total Residents
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {dashboardData?.residents?.total || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    {dashboardData?.residents?.active || 0} active
                  </Typography>
                </Box>
                <People sx={{ fontSize: 40, color: 'info.main', opacity: 0.9 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* SMS Statistics - Top Far Right */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)', height: '100%', transition: 'box-shadow 0.3s', '&:hover': { boxShadow: '0 3px 6px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.23)' } }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="caption" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    SMS Sent (24h)
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {dashboardData?.sms?.sent_last_24h || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    {dashboardData?.sms?.failed_last_24h || 0} failed
                  </Typography>
                </Box>
                <Sms sx={{ fontSize: 40, color: 'success.main', opacity: 0.9 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* MIDDLE ROW - Charts at center intersections */}
        {/* Water Level Trend Chart - Center Left */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Water Level Trend (24 Hours)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={waterLevelTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="time" style={{ fontSize: 12 }} />
                  <YAxis style={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="level" 
                    stroke="#1976d2" 
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Alert History & Telemetry Log */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                System Alert History & Telemetry Log
              </Typography>
              <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 300 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Water Level</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Alert Level</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Triggered Response / Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {alertHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          Waiting for live telemetry...
                        </TableCell>
                      </TableRow>
                    ) : (
                      alertHistory.map((entry, index) => (
                        <TableRow key={`${entry.timestamp}-${index}`} hover>
                          <TableCell>{formatTelemetryTimestamp(entry.timestamp)}</TableCell>
                          <TableCell>
                            {Number(entry.water_level_cm ?? 0).toFixed(1)} cm
                            <br />
                            <Typography variant="caption" color="text.secondary">
                              Raw: {Number(entry.raw ?? entry.water_level_cm ?? 0).toFixed(0)} ADC
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={entry.status || 'Unknown'}
                              color={getStatusColor(entry.status || 'Unknown')}
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>{entry.action || getAlertAction(entry.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Decision support */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Decision Support
              </Typography>
              {dashboardData?.prediction ? <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Current risk assessment
                </Typography>
                <Typography variant="h3" sx={{ mt: 2, fontWeight: 700, color: '#1976d2' }}>
                  {dashboardData.prediction.flood_probability}%
                </Typography>
                <Chip
                  label={dashboardData.prediction.alert_level}
                  color={getStatusColor(dashboardData.prediction.alert_level)}
                  size="small"
                  sx={{ mt: 2, height: 28, fontWeight: 600 }}
                />
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <span>Confidence:</span>
                    <span style={{ fontWeight: 600 }}>{dashboardData.prediction.confidence}%</span>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Trend:</span>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{dashboardData.prediction.trend_direction}</span>
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 2, fontWeight: 600 }}>
                    {dashboardData.prediction.recommended_action}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Based on live threshold and recent sensor trend. This is decision support, not a guaranteed forecast.
                  </Typography>
                </Box>
              </Box> : <Alert severity="info" sx={{ mt: 2 }}>Waiting for a live sensor reading.</Alert>}
            </CardContent>
          </Card>
        </Grid>

        {/* System Status */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                System Status
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box display="flex" alignItems="center" sx={{ py: 0.5 }}>
                  <CheckCircle 
                    color={dashboardData?.system_status?.sensor_status === 'online' ? 'success' : 'error'}
                    sx={{ mr: 1, fontSize: 16 }}
                  />
                  <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                    Sensor: {dashboardData?.system_status?.sensor_status || 'Unknown'}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" sx={{ py: 0.5 }}>
                  <CheckCircle 
                    color={dashboardData?.system_status?.gsm_status === 'connected' ? 'success' : 'error'}
                    sx={{ mr: 1, fontSize: 16 }}
                  />
                  <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                    GSM: {dashboardData?.system_status?.gsm_status || 'Unknown'}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" sx={{ py: 0.5 }}>
                  <CheckCircle 
                    color={dashboardData?.system_status?.ai_prediction_enabled ? 'success' : 'error'}
                    sx={{ mr: 1, fontSize: 16 }}
                  />
                  <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                    AI: {dashboardData?.system_status?.ai_prediction_enabled ? 'Enabled' : 'Disabled'}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" sx={{ py: 0.5 }}>
                  <CheckCircle 
                    color={dashboardData?.system_status?.sms_enabled ? 'success' : 'error'}
                    sx={{ mr: 1, fontSize: 16 }}
                  />
                  <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                    SMS: {dashboardData?.system_status?.sms_enabled ? 'Enabled' : 'Disabled'}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', fontWeight: 500, fontSize: '0.7rem' }}>
                Last: {dashboardData?.system_status?.last_reading_time 
                  ? new Date(dashboardData.system_status.last_reading_time).toLocaleTimeString()
                  : 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  )
}

export default Dashboard
