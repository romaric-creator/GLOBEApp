; Script NSIS personnalisé pour GLOBE Manager
; Copie docker-compose.yml dans %APPDATA%\GlobeManager\ à l'installation

!macro NSIS_HOOK_INSTFILES_START
  ; Créer le dossier de données de l'app
  CreateDirectory "$APPDATA\GlobeManager"

  ; Copier le docker-compose.yml (embarqué dans le répertoire de l'installeur)
  File /oname=$APPDATA\GlobeManager\docker-compose.yml "$EXEDIR\nsis\docker-compose.yml"

  ; Copier le .env si présent
  IfFileExists "$EXEDIR\.env.desktop" 0 +2
    File /oname=$APPDATA\GlobeManager\.env "$EXEDIR\.env.desktop"
!macroend

!macro NSIS_HOOK_INSTFILES_END
  ; Rien à faire en fin d'installation
!macroend
