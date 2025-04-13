import React, { useState, useEffect } from 'react';
import { addYears, subYears, format } from 'date-fns';
import { fetchGeoData } from '../../../services/analyticsService';
import { filterAnalyticsData } from '../../../utils/analyticsFilters';
import AnalyticsFilters from '../../../components/analytics/AnalyticsFilters';
import './GeoAnalytics.css';

// ... rest of the file ... 