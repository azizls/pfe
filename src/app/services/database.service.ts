import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private apiUrl = 'http://127.0.0.1:5000/create-database-and-tables';  // URL du serveur Flask

  constructor(private http: HttpClient) {}

  // 📌 Fonction pour envoyer le JSON au serveur Flask
  createDatabase(data: any): Observable<any> {
    const headers = new HttpHeaders({'Content-Type': 'application/json'});
    return this.http.post(this.apiUrl, data, { headers });
  }
}
