import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private baseUrl = 'http://127.0.0.1:5000';

  constructor(private http: HttpClient) {}

  // 🔹 Récupère la liste des bases de données disponibles
  getDatabases(): Observable<any> {
    return this.http.get(`${this.baseUrl}/get-databases`).pipe(
      catchError(this.handleError)
    );
  }

  // 🔹 Vérifie si une base de données existe
  checkDatabaseExists(databaseName: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/check-database?name=${encodeURIComponent(databaseName)}`).pipe(
      catchError(this.handleError)
    );
  }

  // 🔹 Crée une base de données et ses tables
  createDatabase(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/create-database-and-tables`, data, this.getHttpOptions()).pipe(
      catchError(this.handleError)
    );
  }

  // 🔹 Supprime une base de données spécifique
  deleteDatabase(databaseName: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/delete-database?name=${encodeURIComponent(databaseName)}`).pipe(
      catchError(this.handleError)
    );
  }

  // 🔹 Récupère les tables d'une base de données spécifique
  getTables(databaseName: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/get-tables?databaseName=${encodeURIComponent(databaseName)}`).pipe(
      catchError(this.handleError)
    );
  }

  // 🔹 Insère des données dans une dimension
  insertDimensionData(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/insert-dimension-data`, data, this.getHttpOptions()).pipe(
      catchError(this.handleError)
    );
  }

  // 🔹 Insère des données dans la Fact Table
  insertFactData(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/insert-fact`, data, this.getHttpOptions()).pipe(
      catchError(this.handleError)
    );
  }

  // 🔹 Supprime une table spécifique dans une base de données
  deleteTable(databaseName: string, tableName: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/delete-table?database=${databaseName}&table=${tableName}`).pipe(
      catchError(this.handleError)
    );
  }

  // 🔹 Envoie un message au chatbot Rasa et récupère la réponse
  sendMessage(message: string): Observable<any> {
    const body = { sender: "user", message };
    return this.http.post<any>('http://localhost:5005/webhooks/rest/webhook', body, this.getHttpOptions()).pipe(
      catchError(this.handleError)
    );
  }

  // 🔹 Entraîne le chatbot avec une BD spécifique
  trainChatbot(databaseName: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/train-chatbot`, { database: databaseName }, this.getHttpOptions()).pipe(
      catchError(this.handleError)
    );
  }

  // 🔹 Génère les options HTTP avec les headers
  private getHttpOptions() {
    return {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    };
  }

  // 🔹 Gère les erreurs des requêtes HTTP
  private handleError(error: any) {
    console.error('Une erreur est survenue:', error);
    return throwError(() => new Error(error.error?.message || "Erreur serveur inconnue"));
  }
}
