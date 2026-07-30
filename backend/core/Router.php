<?php

declare(strict_types=1);

namespace ConnectNKT\Core;

use ConnectNKT\Helpers\Response;

final class Router
{
    private array $routes = [];

    public function add(string $method, string $path, callable|array $handler, array $middleware = []): void
    {
        $this->routes[] = compact('method', 'path', 'handler', 'middleware');
    }

    public function get(string $path, callable|array $handler, array $middleware = []): void
    {
        $this->add('GET', $path, $handler, $middleware);
    }

    public function post(string $path, callable|array $handler, array $middleware = []): void
    {
        $this->add('POST', $path, $handler, $middleware);
    }

    public function put(string $path, callable|array $handler, array $middleware = []): void
    {
        $this->add('PUT', $path, $handler, $middleware);
    }

    public function patch(string $path, callable|array $handler, array $middleware = []): void
    {
        $this->add('PATCH', $path, $handler, $middleware);
    }

    public function delete(string $path, callable|array $handler, array $middleware = []): void
    {
        $this->add('DELETE', $path, $handler, $middleware);
    }

    public function dispatch(string $method, string $uri): void
    {
        $method = strtoupper($method);
        $path = rtrim($uri, '/') ?: '/';

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            $params = $this->match($route['path'], $path);
            if ($params === null) {
                continue;
            }

            $GLOBALS['__route_params'] = $params;
            $context = $params;
            foreach ($route['middleware'] as $middleware) {
                $middleware($context);
            }
            $GLOBALS['__auth_context'] = $context;

            $handler = $route['handler'];
            if (is_array($handler) && is_string($handler[0])) {
                $handler[0] = new $handler[0]();
            }

            $result = $this->invokeHandler($handler, array_values($params));
            if ($result !== null) {
                Response::success($result);
            }
            return;
        }

        Response::error('Route not found', 404);
    }

    private function match(string $pattern, string $path): ?array
    {
        $regex = preg_replace('/\:([a-zA-Z_][a-zA-Z0-9_]*)/', '(?P<$1>[^/]+)', $pattern);
        $regex = '#^' . rtrim($regex, '/') . '/?$#';
        if (!preg_match($regex, $path, $matches)) {
            return null;
        }

        $params = [];
        foreach ($matches as $key => $value) {
            if (!is_string($key)) {
                continue;
            }
            $params[$key] = rawurldecode((string) $value);
        }
        return $params;
    }

    private function invokeHandler(callable|array $handler, array $args): mixed
    {
        if (is_array($handler)) {
            $reflection = new \ReflectionMethod($handler[0], $handler[1]);
        } else {
            $reflection = new \ReflectionFunction(\Closure::fromCallable($handler));
        }

        $count = $reflection->getNumberOfParameters();
        return $handler(...array_slice($args, 0, $count));
    }
}
