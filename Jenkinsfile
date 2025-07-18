pipeline {
    agent {
        docker { image 'node:20.15.1-alpine3.20' }
    }
    stages {
        stage('Install dependencies') {
            steps {
                sh 'npm install'   // Or 'npm install', as needed
            }
        }
        stage('Test') {
            steps {
                sh 'node test.js'
            }
        }
    }
}