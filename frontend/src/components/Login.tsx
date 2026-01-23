import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import type { User } from "shared";
import ApiClient, { API_ROUTES } from "../../api/apiClient";

export default function Login() {
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        ApiClient.get<User[]>(API_ROUTES.LIST_USERS).then(setUsers);
    }, []);

    return (
        <>
            <ul>
                {users.map(user => (
                    <li key={user.id}>{user.name} ({user.email})</li>
                ))}
            </ul>
            <Button>Create User</Button>
        </>
    )
}