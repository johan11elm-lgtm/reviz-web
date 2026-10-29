import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const compte = vi.hoisted(() => ({ corriger: vi.fn(), renvoyer: vi.fn() }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'u1', email: 'lea@gmial.com', emailVerified: false, providerData: [{ providerId: 'password' }] },
    corrigerEmail: compte.corriger, resendVerificationEmail: compte.renvoyer, actualiserCompte: vi.fn(),
  }),
}))
vi.mock('../../services/firebaseConfig', () => ({ auth: { currentUser: null } }))

import { CarteEmail } from '../CarteEmail'

const afficher = (props = {}) => render(<MemoryRouter><CarteEmail raison="ia" {...props} /></MemoryRouter>)

describe('<CarteEmail /> — carte d’activation de l’e-mail', () => {
  beforeEach(() => {
    localStorage.clear()
    compte.corriger.mockReset().mockResolvedValue()
    compte.renvoyer.mockReset().mockResolvedValue()
  })

  it('dit ce que l’e-mail débloque et à quelle adresse le lien est parti', () => {
    afficher()
    expect(screen.getByText('Confirme ton e-mail pour parler à Réviz IA')).toBeInTheDocument()
    expect(screen.getByText('lea@gmial.com')).toBeInTheDocument()
    // Domaine inconnu (faute de frappe) : pas de bouton de messagerie, « J'ai confirmé » en premier.
    expect(screen.queryByRole('link', { name: /Ouvrir/ })).toBeNull()
  })

  it('faute de frappe dans l’adresse du compte : la correction proposée en un toucher', async () => {
    afficher()
    fireEvent.click(screen.getByRole('button', { name: 'Corriger en lea@gmail.com' }))
    expect(screen.getByLabelText('Ta bonne adresse')).toHaveValue('lea@gmail.com')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Envoyer le lien à cette adresse' })))
    expect(compte.corriger).toHaveBeenCalledWith('lea@gmail.com', undefined)
  })

  it('renvoyer : le lien repart à l’adresse du compte', async () => {
    afficher()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Renvoyer l’e-mail' })))
    expect(compte.renvoyer).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'E-mail renvoyé' })).toBeDisabled()
  })

  it('corriger : la faute est proposée, le lien part à la bonne adresse, qui s’affiche ensuite', async () => {
    afficher()
    fireEvent.click(screen.getByRole('button', { name: 'Pas la bonne adresse ? Corriger' }))
    fireEvent.change(screen.getByLabelText('Ta bonne adresse'), { target: { value: 'lea@hormail.fr' } })
    fireEvent.click(screen.getByRole('button', { name: 'lea@hotmail.fr' }))
    expect(screen.getByLabelText('Ta bonne adresse')).toHaveValue('lea@hotmail.fr')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Envoyer le lien à cette adresse' })))
    expect(compte.corriger).toHaveBeenCalledWith('lea@hotmail.fr', undefined)
    expect(screen.getByText('Nouveau lien envoyé à')).toBeInTheDocument()
    expect(screen.getByText('lea@hotmail.fr')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ouvrir Outlook' })).toBeInTheDocument()
  })

  it('Firebase redemande une connexion récente : le mot de passe est demandé, puis le lien part', async () => {
    compte.corriger.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/requires-recent-login' }))
    afficher()
    fireEvent.click(screen.getByRole('button', { name: 'Pas la bonne adresse ? Corriger' }))
    fireEvent.change(screen.getByLabelText('Ta bonne adresse'), { target: { value: 'lea@gmail.com' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Envoyer le lien à cette adresse' })))
    expect(screen.getByRole('alert')).toHaveTextContent('entre ton mot de passe Réviz')
    fireEvent.change(screen.getByLabelText('Ton mot de passe Réviz'), { target: { value: 'secret12' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Envoyer le lien à cette adresse' })))
    expect(compte.corriger).toHaveBeenLastCalledWith('lea@gmail.com', 'secret12')
    expect(screen.getByText('lea@gmail.com')).toBeInTheDocument()
  })

  it('refuse l’adresse d’exemple et la même adresse', async () => {
    afficher()
    fireEvent.click(screen.getByRole('button', { name: 'Pas la bonne adresse ? Corriger' }))
    fireEvent.change(screen.getByLabelText('Ta bonne adresse'), { target: { value: 'lea@exemple.com' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Envoyer le lien à cette adresse' })))
    expect(screen.getByRole('alert')).toHaveTextContent('adresse d’exemple')
    fireEvent.change(screen.getByLabelText('Ta bonne adresse'), { target: { value: 'LEA@gmial.com' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Envoyer le lien à cette adresse' })))
    expect(screen.getByRole('alert')).toHaveTextContent('C’est déjà cette adresse')
    expect(compte.corriger).not.toHaveBeenCalled()
  })
})
