import { commerce, commerceError } from '../_lib/commerce.js';
import { json } from '../_lib/admin-auth.js';
export async function onRequestGet({ env }) {
  try { return json(await commerce(env).catalog()); } catch (error) { return commerceError(error); }
}
