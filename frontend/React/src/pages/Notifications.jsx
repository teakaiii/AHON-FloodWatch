import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Badge,
  IconButton,
  Divider,
} from '@mui/material'
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  MarkEmailRead as MarkReadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import api from '../services/api'

const Notifications = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchNotifications()
    fetchUnreadCount()
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/notifications/')
      setNotifications(response.data.results || response.data)
      setError(null)
    } catch (err) {
      setError('Failed to fetch notifications')
    } finally {
      setLoading(false)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/api/notifications/unread-count/')
      setUnreadCount(response.data.unread_count)
    } catch (err) {
      console.error('Failed to fetch unread count:', err)
    }
  }

  const handleMarkAsRead = async (notifId) => {
    try {
      await api.patch(`/api/notifications/${notifId}/`, { is_read: true })
      fetchNotifications()
      fetchUnreadCount()
    } catch (err) {
      setError('Failed to mark notification as read')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/api/notifications/mark-all-read/')
      fetchNotifications()
      fetchUnreadCount()
    } catch (err) {
      setError('Failed to mark all notifications as read')
    }
  }

  const handleDelete = async (notifId) => {
    try {
      await api.delete(`/api/notifications/${notifId}/`)
      fetchNotifications()
      fetchUnreadCount()
    } catch (err) {
      setError('Failed to delete notification')
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon color="success" />
      case 'warning':
        return <WarningIcon color="warning" />
      case 'danger':
        return <ErrorIcon color="error" />
      case 'info':
      default:
        return <InfoIcon color="info" />
    }
  }

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success':
        return 'success'
      case 'warning':
        return 'warning'
      case 'danger':
        return 'error'
      case 'info':
      default:
        return 'info'
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Notifications
          </Typography>
          <Typography variant="body1" color="text.secondary">
            System alerts and updates
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
          {unreadCount > 0 && (
            <Button
              variant="outlined"
              startIcon={<MarkReadIcon />}
              onClick={handleMarkAllAsRead}
            >
              Mark All as Read
            </Button>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <CardContent>
          {notifications.length === 0 ? (
            <Box textAlign="center" py={4}>
              <NotificationsIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
              <Typography variant="h6" color="textSecondary" sx={{ mt: 2 }}>
                No notifications
              </Typography>
              <Typography variant="body2" color="textSecondary">
                You're all caught up!
              </Typography>
            </Box>
          ) : (
            <List>
              {notifications.map((notification) => (
                <React.Fragment key={notification.notif_id}>
                  <ListItem
                    sx={{
                      bgcolor: notification.is_read ? 'transparent' : 'action.hover',
                      borderRadius: 1,
                      mb: 1,
                    }}
                    secondaryAction={
                      <Box>
                        {!notification.is_read && (
                          <IconButton
                            edge="end"
                            onClick={() => handleMarkAsRead(notification.notif_id)}
                            sx={{ mr: 1 }}
                          >
                            <MarkReadIcon />
                          </IconButton>
                        )}
                        <IconButton
                          edge="end"
                          onClick={() => handleDelete(notification.notif_id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemIcon>
                      {getNotificationIcon(notification.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1" fontWeight={notification.is_read ? 'normal' : 'bold'}>
                            {notification.title}
                          </Typography>
                          <Chip
                            label={notification.type}
                            color={getNotificationColor(notification.type)}
                            size="small"
                          />
                        </Box>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {new Date(notification.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default Notifications
