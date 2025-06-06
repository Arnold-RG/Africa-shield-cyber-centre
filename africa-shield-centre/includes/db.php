<?php
/**
 * Database Class
 */

class Database {
    private $pdo;
    
    /**
     * Constructor
     */
    public function __construct() {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ];
            
            $this->pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // Log error and display generic message
            error_log("Database connection error: " . $e->getMessage());
            die("Database connection failed. Please try again later.");
        }
    }
    
    /**
     * Execute a query
     * 
     * @param string $query SQL query
     * @param array $params Query parameters
     * @return PDOStatement|false Query result
     */
    public function query($query, $params = []) {
        try {
            $stmt = $this->pdo->prepare($query);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            error_log("Query error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Fetch a single row
     * 
     * @param string $query SQL query
     * @param array $params Query parameters
     * @return array|false Single row or false on failure
     */
    public function fetchOne($query, $params = []) {
        $stmt = $this->query($query, $params);
        
        if ($stmt) {
            return $stmt->fetch();
        }
        
        return false;
    }
    
    /**
     * Fetch all rows
     * 
     * @param string $query SQL query
     * @param array $params Query parameters
     * @return array|false All rows or false on failure
     */
    public function fetchAll($query, $params = []) {
        $stmt = $this->query($query, $params);
        
        if ($stmt) {
            return $stmt->fetchAll();
        }
        
        return false;
    }
    
    /**
     * Count rows
     * 
     * @param string $query SQL query
     * @param array $params Query parameters
     * @return int|false Number of rows or false on failure
     */
    public function count($query, $params = []) {
        $stmt = $this->query($query, $params);
        
        if ($stmt) {
            return $stmt->rowCount();
        }
        
        return false;
    }
    
    /**
     * Insert data
     * 
     * @param string $table Table name
     * @param array $data Data to insert (column => value)
     * @return int|false Last insert ID or false on failure
     */
    public function insert($table, $data) {
        $columns = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));
        
        $query = "INSERT INTO {$table} ({$columns}) VALUES ({$placeholders})";
        
        $stmt = $this->query($query, array_values($data));
        
        if ($stmt) {
            return $this->pdo->lastInsertId();
        }
        
        return false;
    }
    
    /**
     * Update data
     * 
     * @param string $table Table name
     * @param array $data Data to update (column => value)
     * @param string $where WHERE clause
     * @param array $params WHERE parameters
     * @return int|false Number of affected rows or false on failure
     */
    public function update($table, $data, $where, $params = []) {
        $set = [];
        
        foreach ($data as $column => $value) {
            $set[] = "{$column} = ?";
        }
        
        $set = implode(', ', $set);
        
        $query = "UPDATE {$table} SET {$set} WHERE {$where}";
        
        $stmt = $this->query($query, array_merge(array_values($data), $params));
        
        if ($stmt) {
            return $stmt->rowCount();
        }
        
        return false;
    }
    
    /**
     * Delete data
     * 
     * @param string $table Table name
     * @param string $where WHERE clause
     * @param array $params WHERE parameters
     * @return int|false Number of affected rows or false on failure
     */
    public function delete($table, $where, $params = []) {
        $query = "DELETE FROM {$table} WHERE {$where}";
        
        $stmt = $this->query($query, $params);
        
        if ($stmt) {
            return $stmt->rowCount();
        }
        
        return false;
    }
    
    /**
     * Begin a transaction
     * 
     * @return bool Success or failure
     */
    public function beginTransaction() {
        return $this->pdo->beginTransaction();
    }
    
    /**
     * Commit a transaction
     * 
     * @return bool Success or failure
     */
    public function commit() {
        return $this->pdo->commit();
    }
    
    /**
     * Rollback a transaction
     * 
     * @return bool Success or failure
     */
    public function rollback() {
        return $this->pdo->rollBack();
    }
    
    /**
     * Get the PDO instance
     * 
     * @return PDO PDO instance
     */
    public function getPdo() {
        return $this->pdo;
    }
    
    /**
     * Get the last insert ID
     * 
     * @return string Last insert ID
     */
    public function lastInsertId() {
        return $this->pdo->lastInsertId();
    }
    
    /**
     * Create pagination data
     * 
     * @param string $table Table name
     * @param string $where WHERE clause (optional)
     * @param array $params WHERE parameters (optional)
     * @param int $page Current page
     * @param int $perPage Items per page
     * @param string $orderBy ORDER BY clause (optional)
     * @return array Pagination data
     */
    public function paginate($table, $where = '', $params = [], $page = 1, $perPage = 10, $orderBy = '') {
        // Count total items
        $countQuery = "SELECT COUNT(*) as total FROM {$table}";
        
        if (!empty($where)) {
            $countQuery .= " WHERE {$where}";
        }
        
        $totalItems = $this->fetchOne($countQuery, $params)['total'] ?? 0;
        
        // Calculate pagination values
        $totalPages = ceil($totalItems / $perPage);
        $page = max(1, min($page, $totalPages));
        $offset = ($page - 1) * $perPage;
        
        // Get items for current page
        $query = "SELECT * FROM {$table}";
        
        if (!empty($where)) {
            $query .= " WHERE {$where}";
        }
        
        if (!empty($orderBy)) {
            $query .= " ORDER BY {$orderBy}";
        }
        
        $query .= " LIMIT {$offset}, {$perPage}";
        
        $items = $this->fetchAll($query, $params);
        
        // Return pagination data
        return [
            'items' => $items,
            'total_items' => $totalItems,
            'current_page' => $page,
            'per_page' => $perPage,
            'last_page' => $totalPages,
            'first_page_url' => '?page=1',
            'last_page_url' => "?page={$totalPages}",
            'next_page_url' => $page < $totalPages ? "?page=" . ($page + 1) : null,
            'prev_page_url' => $page > 1 ? "?page=" . ($page - 1) : null,
            'from' => $offset + 1,
            'to' => min($offset + $perPage, $totalItems)
        ];
    }
}

// Initialize database connection
$db = new Database();
