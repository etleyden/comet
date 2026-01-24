import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import type { User } from "shared";
import ApiClient from "../../api/apiClient";
import Register from "./Register";

export default function Login() {
    const [users, setUsers] = useState<User[]>([]);
    const [isRegistering, setIsRegistering] = useState(false);

    useEffect(() => {
        ApiClient.get<User[]>("/users").then(setUsers);
    }, []);

    return (
        <>
            <ul>
                {users.map(user => (
                    <li key={user.id}>{user.name} ({user.email})</li>
                ))}
            </ul>
            {(isRegistering) ? (<Register onCancel={() => setIsRegistering(false)} />) :
                <Button onClick={() => setIsRegistering(true)}>Create User</Button>
            }
        </>
    )
}