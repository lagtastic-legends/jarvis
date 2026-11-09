Set WshShell = CreateObject("WScript.Shell")
' Run npm run server completely hidden in the background (0 = hidden window)
WshShell.CurrentDirectory = "c:\Users\devra\Downloads\jarvis"
WshShell.Run "cmd /c npm run server", 0, False
