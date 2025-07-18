pipeline {
    agent {
        docker { image 'node:20.15.1-alpine3.20' }
    }
    stages {
        stage('Test') {
            dir('scripts') {
                steps {
                    sh 'node scripts/test.js'
                }
            }
        }
    }
}