import { HttpHeaders } from '@angular/common/http';

export function authorizationHeaders(): HttpHeaders {
  const accessToken = localStorage.getItem('mrb.accessToken');
  return accessToken
    ? new HttpHeaders({ authorization: `Bearer ${accessToken}` })
    : new HttpHeaders();
}
