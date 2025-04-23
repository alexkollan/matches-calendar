import React from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import TeamFilter from './components/TeamFilter';

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
        </ThemeProvider>
    );
}

export default App;