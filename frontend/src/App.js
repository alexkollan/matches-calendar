import React from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import TeamFilter from './components/TeamFilter';
import ToastContainer from './components/ToastContainer';

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
    },
});

function App() {
    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <TeamFilter />
            <ToastContainer />
        </ThemeProvider>
    );
}

export default App;