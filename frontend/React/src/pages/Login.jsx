import React, { useState } from 'react'
import {
  Paper,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(username, password)

    if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.error)
    }

    setLoading(false)
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#f2f2f2',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      <Box
        sx={{
          background: '#4a2a1d',
          height: 52,
          display: 'flex',
          alignItems: 'center',
          px: 2.5,
          color: '#fff',
          boxSizing: 'border-box',
        }}
      >
        <Typography sx={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.5px' }}>
          AHON FloodWatch
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          px: 2,
          py: 4,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 420,
            background: '#f7f7f7',
            border: '1px solid #d9d9d9',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            p: '28px 28px 20px',
            boxSizing: 'border-box',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
            <Box
              sx={{
                width: 86,
                height: 86,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box
                component="img"
                src="/logo.png"
                alt="AHON FloodWatch logo"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            </Box>
          </Box>

          <Typography
            component="h1"
            sx={{
              textAlign: 'center',
              m: 0,
              fontSize: 30,
              fontWeight: 700,
              color: '#111',
            }}
          >
            AHON FloodWatch
          </Typography>

          <Typography
            sx={{
              textAlign: 'center',
              fontSize: 15,
              color: '#666',
              mb: 2.5,
            }}
          >
            Barangay Tonsuya, Malabon
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2, boxSizing: 'border-box' }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <Box sx={{ mb: 1.5 }}>
              <Typography sx={{ display: 'block', fontSize: 14, mb: 1, color: '#333' }}>
                Username
              </Typography>
              <TextField
                required
                fullWidth
                id="username"
                name="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: '#edf3fa',
                    borderRadius: '6px',
                    '& fieldset': {
                      borderColor: '#b9cfe0',
                    },
                    '&:hover fieldset': {
                      borderColor: '#b9cfe0',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#4c7ef3',
                      boxShadow: '0 0 0 2px rgba(76,126,243,0.12)',
                    },
                  },
                }}
              />
            </Box>

            <Box sx={{ mb: 1.5 }}>
              <Typography sx={{ display: 'block', fontSize: 14, mb: 1, color: '#333' }}>
                Password
              </Typography>
              <TextField
                required
                fullWidth
                name="password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={showPassword ? 'Hide password' : 'Show password'}>
                        <IconButton
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPassword((visible) => !visible)}
                          onMouseDown={(e) => e.preventDefault()}
                          edge="end"
                          disabled={loading}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: '#edf3fa',
                    borderRadius: '6px',
                    '& fieldset': {
                      borderColor: '#b9cfe0',
                    },
                    '&:hover fieldset': {
                      borderColor: '#b9cfe0',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#4c7ef3',
                      boxShadow: '0 0 0 2px rgba(76,126,243,0.12)',
                    },
                  },
                }}
              />
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 1,
                background: '#1f7fe6',
                color: '#fff',
                borderRadius: '6px',
                py: 1.2,
                fontSize: 18,
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': {
                  background: '#1969ca',
                },
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Sign In'}
            </Button>
          </Box>

          <Typography
            sx={{
              textAlign: 'center',
              mt: 3,
              fontSize: 12,
              color: '#777',
            }}
          >
            © 2026 AHON FloodWatch - Barangay Tonsuya
          </Typography>
        </Paper>
      </Box>
    </Box>
  )
}

export default Login
