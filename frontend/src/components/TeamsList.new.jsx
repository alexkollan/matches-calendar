import React from 'react';
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Grid
} from '@mui/material';

const TeamsList = React.memo(({ filteredTeams, selectedTeams, handleTeamChange }) => {
    if (filteredTeams.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary" fontStyle="italic">
                    No teams match your search
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <FormGroup>
                <Grid container spacing={1}>
                    {filteredTeams.map((team) => (
                        <Grid item xs={12} sm={6} md={4} key={team}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={selectedTeams.includes(team)}
                                        onChange={() => handleTeamChange(team)}
                                        size="small"
                                    />
                                }
                                label={
                                    <Typography variant="body2">
                                        {team}
                                    </Typography>
                                }
                                sx={{
                                    m: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    width: '100%',
                                    py: 0.5,
                                    px: 1,
                                    borderRadius: 1,
                                    '&:hover': {
                                        backgroundColor: 'action.hover'
                                    }
                                }}
                            />
                        </Grid>
                    ))}
                </Grid>
            </FormGroup>
        </Box>
    );
});

export default TeamsList;
