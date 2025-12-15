'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

export type AuthMessageType = 'success' | 'error' | null;

export interface AuthStatusMessage {
    type: AuthMessageType;
    text: string;
}

export function useAuthStatusMessage(): AuthStatusMessage {
    const searchParams = useSearchParams();

    const status = searchParams.get('status');
    const error = searchParams.get('error');

    return useMemo(() => {
        /* =======================
           SUCCESS CASES
        ======================= */
        if (status) {
            switch (status) {
                case 'registered':
                    return {
                        type: 'success',
                        text:
                            'Erfolgreich registriert! Bitte verifiziere deine E-Mail, um dich anmelden zu können.',
                    };

                case 'forgot-password':
                    return {
                        type: 'success',
                        text: 'E-Mail zum Zurücksetzen des Passworts wurde versendet.',
                    };

                case 'password-reset':
                    return {
                        type: 'success',
                        text: 'Passwort erfolgreich geändert. Du kannst dich jetzt anmelden.',
                    };

                case 'email-verified':
                    return {
                        type: 'success',
                        text: 'E-Mail erfolgreich verifiziert. Du kannst dich jetzt anmelden.',
                    };

                default:
                    return { type: null, text: '' };
            }
        }

        /* =======================
           ERROR CASES
        ======================= */
        if (error) {
            switch (error) {
                case 'invalid-credentials':
                    return {
                        type: 'error',
                        text: 'Benutzername/E-Mail oder Passwort ist falsch.',
                    };

                case 'email-not-verified':
                    return {
                        type: 'error',
                        text: 'Bitte verifiziere zuerst deine E-Mail-Adresse.',
                    };

                case 'expired-token':
                    return {
                        type: 'error',
                        text: 'Der Link ist abgelaufen. Bitte fordere einen neuen an.',
                    };

                case 'user-not-found':
                    return {
                        type: 'error',
                        text: 'Kein Benutzer mit dieser E-Mail-Adresse gefunden.',
                    };
                case 'user-already-exists':
                    return {
                        type: 'error',
                        text: 'E-Mail-Adresse oder Benutzername ist bereits vergeben.',
                    };
                case 'register-failed':
                    return {
                        type: 'error',
                        text: 'Registrierung fehlgeschlagen. Bitte versuche es erneut.',
                    };

                default:
                    return {
                        type: 'error',
                        text: 'Ein unbekannter Fehler ist aufgetreten.',
                    };
            }
        }

        return { type: null, text: '' };
    }, [status, error]);
}
