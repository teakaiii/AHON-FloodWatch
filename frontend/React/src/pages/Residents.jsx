import React, { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  ButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Select,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'
import {
  Add as AddIcon,
  ArrowDropDown as ArrowDropDownIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  UploadFile as UploadFileIcon,
} from '@mui/icons-material'
import api from '../services/api'

const Residents = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [residents, setResidents] = useState([])
  const [statistics, setStatistics] = useState(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingResident, setEditingResident] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPurok, setFilterPurok] = useState('')
  const [importing, setImporting] = useState(false)
  const [importErrors, setImportErrors] = useState([])
  
  const [formData, setFormData] = useState({
    full_name: '',
    mobile_number: '',
    address: '',
    purok_zone: '',
    status: 'active',
    sms_enabled: true
  })
  const [fileInput, setFileInput] = useState(null)
  const [menuAnchorEl, setMenuAnchorEl] = useState(null)

  useEffect(() => {
    fetchResidents()
    fetchStatistics()
  }, [])

  const fetchResidents = async () => {
    try {
      console.log('Fetching residents...')
      const response = await api.get('/api/residents/')
      console.log('Residents response:', response.data)
      setResidents(response.data.results || response.data)
      setError(null)
    } catch (err) {
      console.error('Residents fetch error:', err)
      setError('Failed to fetch residents')
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/api/residents/statistics/')
      setStatistics(response.data)
    } catch (err) {
      console.error('Failed to fetch statistics:', err)
    }
  }

  const handleOpenDialog = (resident = null) => {
    if (resident) {
      setEditingResident(resident)
      setFormData({
        full_name: resident.full_name,
        mobile_number: resident.mobile_number?.startsWith('+63')
          ? resident.mobile_number.slice(3)
          : resident.mobile_number,
        address: resident.address,
        purok_zone: resident.purok_zone,
        status: resident.status,
        sms_enabled: resident.sms_enabled
      })
    } else {
      setEditingResident(null)
      setFormData({
        full_name: '',
        mobile_number: '',
        address: '',
        purok_zone: '',
        status: 'active',
        sms_enabled: true
      })
    }
    setOpenDialog(true)
  }

  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setMenuAnchorEl(null)
  }

  const handleMenuAction = (action) => {
    handleMenuClose()
    if (action === 'add') {
      handleOpenDialog()
    } else if (action === 'import') {
      document.getElementById('resident-import-input')?.click()
    } else if (action === 'template') {
      window.location.href = '/residents_template.csv'
    }
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingResident(null)
  }

  const handleSubmit = async () => {
    try {
      if (editingResident) {
        await api.put(`/api/residents/${editingResident.resident_id}/`, formData)
      } else {
        await api.post('/api/residents/', formData)
      }
      handleCloseDialog()
      fetchResidents()
      fetchStatistics()
    } catch (err) {
      console.error('Resident save error:', err)
      setError('Failed to save resident')
    }
  }

  const handleImportCsv = async () => {
    if (!fileInput) {
      setError('Please select a CSV file to import.')
      return
    }

    setImporting(true)
    setError(null)
    setImportErrors([])

    const formDataObj = new FormData()
    formDataObj.append('file', fileInput)

    try {
      const response = await api.post('/api/residents/import/', formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      if (response.data.errors?.length) {
        setImportErrors(response.data.errors)
      }
      setFileInput(null)
      fetchResidents()
      fetchStatistics()
    } catch (err) {
      console.error('CSV import error:', err)
      setError('Failed to import residents from CSV')
    } finally {
      setImporting(false)
    }
  }

  const handleDelete = async (residentId) => {
    if (window.confirm('Are you sure you want to delete this resident?')) {
      try {
        await api.delete(`/api/residents/${residentId}/`)
        fetchResidents()
        fetchStatistics()
      } catch (err) {
        setError('Failed to delete resident')
      }
    }
  }

  const filteredResidents = residents.filter(resident => {
    const matchesSearch = 
      resident.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resident.mobile_number.includes(searchTerm) ||
      resident.address.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPurok = !filterPurok || resident.purok_zone === filterPurok
    return matchesSearch && matchesPurok
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'inactive':
        return 'default'
      case 'evacuated':
        return 'warning'
      default:
        return 'default'
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Residents Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage resident information for SMS alerts
          </Typography>
        </Box>
        <Box display="flex" gap={2} flexWrap="wrap">
          <ButtonGroup variant="contained" aria-label="resident action menu">
            <Button startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
              Add Resident
            </Button>
            <Button
              size="small"
              aria-controls={menuAnchorEl ? 'resident-action-menu' : undefined}
              aria-haspopup="true"
              onClick={handleMenuOpen}
            >
              <ArrowDropDownIcon />
            </Button>
          </ButtonGroup>
          <Menu
            id="resident-action-menu"
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => handleMenuAction('add')}>Add Resident</MenuItem>
            <MenuItem onClick={() => handleMenuAction('import')}>Import CSV</MenuItem>
            <MenuItem onClick={() => handleMenuAction('template')}>Download Template</MenuItem>
          </Menu>
          <input
            id="resident-import-input"
            type="file"
            accept=".csv"
            hidden
            onChange={(e) => setFileInput(e.target.files[0])}
          />
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => document.getElementById('resident-import-input')?.click()}
            disabled={importing}
          >
            Upload CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            href="/residents_template.csv"
            download="residents_template.csv"
          >
            Download Template
          </Button>
        </Box>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Alert severity="info" sx={{ mb: 2 }}>
        CSV template columns: full_name, mobile_number, address, purok_zone, status, sms_enabled
      </Alert>
      {importErrors.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Some rows failed to import:</Typography>
          {importErrors.map((err, index) => (
            <Typography key={index} variant="body2">
              Row {err.row}: {JSON.stringify(err.errors)}
            </Typography>
          ))}
        </Alert>
      )}
      {fileInput && (
        <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
          <Typography>{fileInput.name}</Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={handleImportCsv}
            disabled={importing}
          >
            {importing ? 'Importing...' : 'Upload CSV'}
          </Button>
        </Box>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total Residents
              </Typography>
              <Typography variant="h4">
                {statistics?.total_residents || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Active Residents
              </Typography>
              <Typography variant="h4">
                {statistics?.active_residents || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                SMS Enabled
              </Typography>
              <Typography variant="h4">
                {statistics?.sms_enabled_count || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Purok Zones
              </Typography>
              <Typography variant="h4">
                {Object.keys(statistics?.purok_counts || {}).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Search residents"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Purok</InputLabel>
                <Select
                  value={filterPurok}
                  label="Filter by Purok"
                  onChange={(e) => setFilterPurok(e.target.value)}
                >
                  <MenuItem value="">All Puroks</MenuItem>
                  {Object.keys(statistics?.purok_counts || {}).map(purok => (
                    <MenuItem key={purok} value={purok}>{purok}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Residents Table */}
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Mobile Number</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Purok/Zone</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>SMS Enabled</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredResidents.map((resident) => (
                  <TableRow key={resident.resident_id}>
                    <TableCell>{resident.full_name}</TableCell>
                    <TableCell>{resident.mobile_number}</TableCell>
                    <TableCell>{resident.address}</TableCell>
                    <TableCell>{resident.purok_zone}</TableCell>
                    <TableCell>
                      <Chip
                        label={resident.status}
                        color={getStatusColor(resident.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={resident.sms_enabled ? 'Yes' : 'No'}
                        color={resident.sms_enabled ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(resident)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(resident.resident_id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingResident ? 'Edit Resident' : 'Add Resident'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Full Name"
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Mobile Number"
              value={formData.mobile_number}
              placeholder="9123456789"
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '')
                setFormData({
                  ...formData,
                  mobile_number: digits.slice(0, 10)
                })
              }}
              helperText="Enter 10 digits. +63 will be added automatically."
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>+63</Typography>
              }}
            />
            <TextField
              fullWidth
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Purok/Zone"
              value={formData.purok_zone}
              onChange={(e) => setFormData({...formData, purok_zone: e.target.value})}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="evacuated">Evacuated</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingResident ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Residents
