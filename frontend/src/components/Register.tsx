import { Box, Button, FormGroup, TextField } from "@mui/material";
import ApiClient from "../../api/apiClient";
import { useState } from "react";

export default function Register(props: {
    onCancel: () => void;
}) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const handleRegistration = () => {
        ApiClient.post("/users", {
            name: name,
            email: email
        }).then(() => {
            // TODO: implement more here
            return;
        });
    };
    return (
        <FormGroup sx={{ display: "flex", gap: 1, width: 300 }}>
            <TextField label="Name" variant="outlined" value={name} onChange={e => setName(e.target.value)} />
            <TextField label="Email" variant="outlined" value={email} onChange={e => setEmail(e.target.value)} />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Button onClick={handleRegistration}>Register</Button>
                <Button variant="outlined" onClick={props.onCancel}>Cancel</Button>
            </Box>
        </FormGroup>
    )
}