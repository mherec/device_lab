from livereload import Server, shell

server = Server()
# obserwuje wszystkie pliki w katalogu
server.watch('.', delay=1)
# hostuje na porcie 8001
server.serve(port=8001, root='.')
